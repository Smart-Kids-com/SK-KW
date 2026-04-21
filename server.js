#!/usr/bin/env node
// server.js - خادم Express الرئيسي لنظام إدارة الطلبات
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const db = require('./db/turso-manager');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');
const collectionsRoutes = require('./routes/collections');
const customersRoutes = require('./routes/customers');
const themeRoutes = require('./routes/theme');
const abandonedCheckoutsRoutes = require('./routes/abandoned-checkouts');
const discountsRoutes = require('./routes/discounts');
const adminDashboardRoutes = require('./routes/admin-dashboard');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * IMPORTANT SECURITY:
 * - Do NOT keep fallback/default admin passwords in code (repo may be public).
 * - Admin passwords must come ONLY from environment variables.
 */
const ADMIN_PASSWORDS = [
  process.env.ADMIN_PASSWORD_1,
  process.env.ADMIN_PASSWORD_2
].filter(Boolean);

if (ADMIN_PASSWORDS.length === 0) {
  throw new Error('Missing ADMIN_PASSWORD_1/2 env vars. Refusing to start for security.');
}

/**
 * OTP secret (Base32).
 * Make it REQUIRED for security so nobody runs admin with password-only by mistake.
 */
function normalizeBase32Secret(value) {
  // remove spaces, make uppercase (common format for TOTP base32 secrets)
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

const ADMIN_OTP_SECRET = normalizeBase32Secret(process.env.ADMIN_OTP_SECRET);

if (!ADMIN_OTP_SECRET) {
  throw new Error('Missing ADMIN_OTP_SECRET env var. Refusing to start for security.');
}

// Optional sanity check: base32 is typically A-Z2-7 and may include '=' padding
// We don't block startup hard (to avoid breaking existing secrets), but it can help spot typos.
const BASE32_LIKE = /^[A-Z2-7]+=*$/;
if (!BASE32_LIKE.test(ADMIN_OTP_SECRET)) {
  console.warn('⚠️ ADMIN_OTP_SECRET does not look like Base32 (A-Z2-7). Check for typos/spaces.');
}

const ADMIN_COOKIE_NAME = 'smartkids_admin_auth';
const ADMIN_OTP_COOKIE_NAME = 'smartkids_admin_otp';
const ADMIN_OTP_TRIES_COOKIE_NAME = 'smartkids_admin_otp_tries';

/** Session times */
const ADMIN_SESSION_SECONDS = 60 * 60 * 12; // 12 hours
const OTP_SESSION_SECONDS = 60 * 60 * 12;   // 12 hours
const OTP_TRIES_MAX = 2;

// إنشاء تطبيق Express
const app = express();

/* =========================================
   أدوات المساعدة
========================================= */

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return acc;

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();

    if (key) {
      acc[key] = decodeURIComponent(value);
    }

    return acc;
  }, {});
}

function buildCookieGeneric(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (Number.isFinite(maxAgeSeconds)) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildAdminCookie(value, maxAgeSeconds) {
  return buildCookieGeneric(ADMIN_COOKIE_NAME, value, maxAgeSeconds);
}

function buildOtpCookie(value, maxAgeSeconds) {
  return buildCookieGeneric(ADMIN_OTP_COOKIE_NAME, value, maxAgeSeconds);
}

function buildOtpTriesCookie(value, maxAgeSeconds) {
  return buildCookieGeneric(ADMIN_OTP_TRIES_COOKIE_NAME, value, maxAgeSeconds);
}

/**
 * Admin is fully authenticated ONLY if:
 * - password session cookie exists AND
 * - OTP session cookie exists
 */
function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE_NAME] === '1' && cookies[ADMIN_OTP_COOKIE_NAME] === '1';
}

/**
 * Only checks that password was correct (before OTP).
 */
function hasAdminPasswordSession(req) {
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE_NAME] === '1';
}

function getOtpTries(req) {
  const cookies = parseCookies(req);
  const raw = cookies[ADMIN_OTP_TRIES_COOKIE_NAME];
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sanitizeNextUrl(value) {
  const nextUrl = String(value || '').trim();
  if (!nextUrl || !nextUrl.startsWith('/')) {
    return '/admin-enhanced';
  }
  return nextUrl;
}

function requireAdminAuth(req, res, next) {
  if (isAdminAuthenticated(req)) {
    return next();
  }

  const nextUrl = encodeURIComponent(req.originalUrl || '/admin-enhanced');
  return res.redirect(`/admin?next=${nextUrl}`);
}

/**
 * API write protection:
 * - Allows public GET/HEAD/OPTIONS (site uses API for reads)
 * - Allows public checkout: POST /api/orders
 * - Requires admin cookie for any other POST/PUT/PATCH/DELETE
 *
 * SECURITY ADDITION:
 * - Protect orders reads (GET /api/orders and GET /api/orders/:id) because they include PII.
 */
function requireAdminApiWriteAuth(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  const pathname = String(req.path || '');

  // reads
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    // Protect orders reads (PII) - admin only
    // NOTE: this middleware is mounted at /api, so:
    // - GET /api/orders     -> req.path "/orders"
    // - GET /api/orders/123 -> req.path "/orders/123"
    if (pathname === '/orders' || pathname.startsWith('/orders/')) {
      if (isAdminAuthenticated(req)) return next();

      return res.status(401).json({
        success: false,
        error: 'غير مصرح. قراءة الطلبات تتطلب دخول الإدارة.'
      });
    }

    // Other reads remain public
    return next();
  }

  // public checkout: create order
  // NOTE: this middleware is mounted at /api, so req.path for POST /api/orders is "/orders"
  if (method === 'POST' && pathname === '/orders') {
    return next();
  }

  // admin-only writes
  if (isAdminAuthenticated(req)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'غير مصرح. هذه العملية تتطلب دخول الإدارة.'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAdminLoginPage({ next = '/admin-enhanced', error = '' } = {}) {
  const safeNext = escapeHtml(next);
  const safeError = escapeHtml(error);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>دخول الإدارة - Smart Kids Kuwait</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:Segoe UI,Tahoma,Arial,sans-serif;
      background:linear-gradient(135deg,#f5f1fb 0%,#ebe3f7 100%);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      color:#2d2340;
    }
    .card{
      width:100%;
      max-width:420px;
      background:#fff;
      border:1px solid #e7ddf4;
      border-radius:20px;
      box-shadow:0 18px 48px rgba(106,76,147,.12);
      padding:28px;
    }
    .brand{
      text-align:center;
      margin-bottom:22px;
    }
    .brand h1{
      font-size:28px;
      color:#6a4c93;
      margin-bottom:8px;
    }
    .brand p{
      color:#6e6680;
      font-size:15px;
    }
    .error{
      background:#ffe9ea;
      color:#a9353f;
      border:1px solid #f3c8cc;
      padding:12px 14px;
      border-radius:12px;
      margin-bottom:16px;
      font-size:14px;
    }
    .field{
      margin-bottom:16px;
    }
    label{
      display:block;
      margin-bottom:8px;
      font-weight:700;
      color:#4e3a70;
      font-size:14px;
    }
    input{
      width:100%;
      padding:14px 16px;
      border:1px solid #d8c9ef;
      border-radius:14px;
      font-size:15px;
      outline:none;
    }
    input:focus{
      border-color:#8c63c9;
      box-shadow:0 0 0 4px rgba(140,99,201,.12);
    }
    button{
      width:100%;
      border:none;
      border-radius:14px;
      background:#6a4c93;
      color:#fff;
      padding:14px 16px;
      font-size:16px;
      font-weight:700;
      cursor:pointer;
    }
    button:hover{
      background:#5e4485;
    }
    .hint{
      margin-top:14px;
      text-align:center;
      font-size:13px;
      color:#857a99;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <h1>دخول الإدارة</h1>
      <p>Smart Kids Kuwait Admin</p>
    </div>

    ${safeError ? `<div class="error">${safeError}</div>` : ''}

    <form method="POST" action="/admin-login">
      <input type="hidden" name="next" value="${safeNext}" />
      <div class="field">
        <label for="password">كلمة المرور</label>
        <input id="password" name="password" type="password" placeholder="أدخل كلمة مرور الإدارة" required />
      </div>
      <button type="submit">دخول</button>
    </form>

    <div class="hint">الصفحة محمية</div>
  </div>
</body>
</html>`;
}

function renderAdminOtpPage({ next = '/admin-enhanced', error = '', otpUri = '', qrDataUrl = '', secret = '' } = {}) {
  const safeNext = escapeHtml(next);
  const safeError = escapeHtml(error);
  const safeOtpUri = escapeHtml(otpUri);
  const safeSecret = escapeHtml(secret);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>رمز التحقق - Smart Kids Kuwait</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:Segoe UI,Tahoma,Arial,sans-serif;
      background:linear-gradient(135deg,#f5f1fb 0%,#ebe3f7 100%);
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      color:#2d2340;
    }
    .card{
      width:100%;
      max-width:520px;
      background:#fff;
      border:1px solid #e7ddf4;
      border-radius:20px;
      box-shadow:0 18px 48px rgba(106,76,147,.12);
      padding:28px;
    }
    .brand{
      text-align:center;
      margin-bottom:16px;
    }
    .brand h1{
      font-size:24px;
      color:#6a4c93;
      margin-bottom:6px;
    }
    .brand p{
      color:#6e6680;
      font-size:14px;
    }
    .error{
      background:#ffe9ea;
      color:#a9353f;
      border:1px solid #f3c8cc;
      padding:12px 14px;
      border-radius:12px;
      margin-bottom:16px;
      font-size:14px;
    }
    .field{
      margin-bottom:14px;
    }
    label{
      display:block;
      margin-bottom:8px;
      font-weight:700;
      color:#4e3a70;
      font-size:14px;
    }
    input{
      width:100%;
      padding:14px 16px;
      border:1px solid #d8c9ef;
      border-radius:14px;
      font-size:18px;
      outline:none;
      letter-spacing:3px;
      text-align:center;
    }
    input:focus{
      border-color:#8c63c9;
      box-shadow:0 0 0 4px rgba(140,99,201,.12);
    }
    button{
      width:100%;
      border:none;
      border-radius:14px;
      background:#6a4c93;
      color:#fff;
      padding:14px 16px;
      font-size:16px;
      font-weight:700;
      cursor:pointer;
    }
    button:hover{
      background:#5e4485;
    }
    .setup{
      margin-top:18px;
      padding-top:18px;
      border-top:1px solid #eee;
    }
    .qr{
      display:flex;
      justify-content:center;
      margin:14px 0;
    }
    .qr img{
      width:220px;
      height:220px;
      border:1px solid #e7ddf4;
      border-radius:12px;
      padding:10px;
      background:#fff;
    }
    .secretBox{
      background:#faf7ff;
      border:1px solid #e7ddf4;
      border-radius:12px;
      padding:12px;
      font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size:13px;
      word-break:break-all;
      margin-top:10px;
    }
    .copyBtn{
      margin-top:10px;
      background:#4e3a70;
    }
    .small{
      font-size:12px;
      color:#857a99;
      margin-top:8px;
      line-height:1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <h1>رمز التحقق (Google Authenticator)</h1>
      <p>أدخل كود 6 أرقام</p>
    </div>

    ${safeError ? `<div class="error">${safeError}</div>` : ''}

    <form method="POST" action="/admin-otp">
      <input type="hidden" name="next" value="${safeNext}" />
      <div class="field">
        <label for="otp">رمز التحقق</label>
        <input id="otp" name="otp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required />
      </div>
      <button type="submit">تأكيد</button>
    </form>

    <div class="setup">
      <div class="small">
        لو أول مرة: افتح Google Authenticator → اضغط (+) → Scan QR أو أدخل الـ Secret يدويًا.
      </div>

      ${qrDataUrl ? `<div class="qr"><img alt="QR" src="${qrDataUrl}" /></div>` : ''}

      <div class="small">OTP URI (لو محتاجه):</div>
      <div class="secretBox">${safeOtpUri}</div>

      <div class="small">Secret (للنسخ اليدوي):</div>
      <div class="secretBox" id="secret">${safeSecret}</div>

      <button class="copyBtn" type="button" onclick="copySecret()">Copy Secret</button>

      <div class="small">
        ملاحظة: الكود بيتغير كل ~30 ثانية.
      </div>
    </div>
  </div>

  <script>
    function copySecret(){
      var el = document.getElementById('secret');
      var text = (el && el.textContent) ? el.textContent : '';
      if(!text) return;
      navigator.clipboard.writeText(text).then(function(){
        alert('تم نسخ الـ Secret');
      }).catch(function(){
        prompt('انسخ الـ Secret يدويًا:', text);
      });
    }
  </script>
</body>
</html>`;
}

/* =========================================
   تهيئة قاعدة البيانات مرة واحدة
========================================= */

let dbReadyPromise = null;

async function ensureDbReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      if (typeof db.open === 'function') {
        await db.open();
      }
      if (typeof db.initializeTables === 'function') {
        await db.initializeTables();
      }
    })().catch((error) => {
      dbReadyPromise = null;
      throw error;
    });
  }

  return dbReadyPromise;
}

/* =========================================
   Middleware عامة
========================================= */

/**
 * Tighten CORS:
 * - Site uses same-origin API calls, but CORS can still be hit by external sites.
 * - We'll allow only your own origins (and allow no-origin for curl/server-to-server).
 */
const allowedOrigins = new Set(
  [
    process.env.PUBLIC_ORIGIN, // optional
    'https://smartkidskw.com',
    'https://www.smartkidskw.com',
    'http://localhost:3000'
  ].filter(Boolean)
);

app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin requests (no Origin header) e.g. curl, server-to-server
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

/* =========================================
   صفحات الإدارة المحمية قبل static
========================================= */

app.use(
  [
    '/admin-enhanced',
    '/admin-enhanced.html',
    '/products-admin',
    '/products-admin.html',
    '/product-edit.html',
    '/order-details.html',
    '/collections-admin',
    '/collections-admin.html',
    '/collection-edit.html',
    '/customers-admin',
    '/customers-admin.html',
    '/customer-view.html',
    '/customers-view.html',
    '/theme-admin',
    '/theme-admin.html',
    '/discounts-admin',
    '/discounts-admin.html'
  ],
  requireAdminAuth
);

/* =========================================
   تهيئة قاعدة البيانات قبل الـ API
========================================= */

app.use('/api', async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Protect API writes (admin only) without breaking public GET
 * and without breaking public checkout (POST /api/orders).
 */
app.use('/api', requireAdminApiWriteAuth);

/* =========================================
   Routes للـ API
========================================= */

app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/abandoned-checkouts', abandonedCheckoutsRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/admin-dashboard', adminDashboardRoutes);

// Route للـ Health Check
app.get('/api/health', async (req, res, next) => {
  try {
    await ensureDbReady();
    res.json({
      success: true,
      message: 'النظام يعمل بشكل صحيح',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================
   الصفحات الرئيسية
========================================= */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  const nextUrl = sanitizeNextUrl(req.query.next || '/admin-enhanced');
  const error = String(req.query.error || '').trim();

  // If fully authed, go to next
  if (isAdminAuthenticated(req)) {
    return res.redirect(nextUrl);
  }

  // If password session exists but OTP missing -> go to OTP step
  if (hasAdminPasswordSession(req)) {
    const safeNext = encodeURIComponent(nextUrl);
    return res.redirect(`/admin-otp?next=${safeNext}`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderAdminLoginPage({ next: nextUrl, error }));
});

app.get('/admin.html', (req, res) => {
  return res.redirect('/admin');
});

/**
 * Step 1: Password
 */
app.post('/admin-login', (req, res) => {
  const password = String(req.body.password || '').trim();
  const nextUrl = sanitizeNextUrl(req.body.next || '/admin-enhanced');

  if (!ADMIN_PASSWORDS.includes(password)) {
    const safeNext = encodeURIComponent(nextUrl);
    const error = encodeURIComponent('كلمة المرور غير صحيحة');
    return res.redirect(`/admin?next=${safeNext}&error=${error}`);
  }

  // Set password session cookie, clear OTP session & tries
  res.setHeader('Set-Cookie', [
    buildAdminCookie('1', ADMIN_SESSION_SECONDS),
    buildOtpCookie('', 0),
    buildOtpTriesCookie('0', 60 * 10) // tries window 10 minutes
  ]);

  const safeNext = encodeURIComponent(nextUrl);
  return res.redirect(`/admin-otp?next=${safeNext}`);
});

/**
 * Step 2: OTP page
 */
app.get('/admin-otp', async (req, res, next) => {
  try {
    const nextUrl = sanitizeNextUrl(req.query.next || '/admin-enhanced');
    const error = String(req.query.error || '').trim();

    if (isAdminAuthenticated(req)) {
      return res.redirect(nextUrl);
    }

    // Must have passed password first
    if (!hasAdminPasswordSession(req)) {
      const safeNext = encodeURIComponent(nextUrl);
      const err = encodeURIComponent('الرجاء إدخال كلمة المرور أولاً');
      return res.redirect(`/admin?next=${safeNext}&error=${err}`);
    }

    // Generate otpauth URI + QR
    const issuer = 'Smart Kids Kuwait';
    const label = 'SmartKids Admin';

    const otpUri = speakeasy.otpauthURL({
      secret: ADMIN_OTP_SECRET,
      label,
      issuer,
      encoding: 'base32'
    });

    const qrDataUrl = await qrcode.toDataURL(otpUri);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderAdminOtpPage({
      next: nextUrl,
      error,
      otpUri,
      qrDataUrl,
      secret: ADMIN_OTP_SECRET
    }));
  } catch (error) {
    next(error);
  }
});

app.post('/admin-otp', (req, res) => {
  const otp = String(req.body.otp || '').trim();
  const nextUrl = sanitizeNextUrl(req.body.next || '/admin-enhanced');

  // Must have passed password first
  if (!hasAdminPasswordSession(req)) {
    const safeNext = encodeURIComponent(nextUrl);
    const err = encodeURIComponent('الرجاء إدخال كلمة المرور أولاً');
    return res.redirect(`/admin?next=${safeNext}&error=${err}`);
  }

  const tries = getOtpTries(req);
  if (tries >= OTP_TRIES_MAX) {
    // force password again
    res.setHeader('Set-Cookie', [
      buildAdminCookie('', 0),
      buildOtpCookie('', 0),
      buildOtpTriesCookie('0', 60 * 10)
    ]);

    const safeNext = encodeURIComponent(nextUrl);
    const err = encodeURIComponent('تم تجاوز عدد محاولات OTP. الرجاء إدخال كلمة المرور مرة أخرى.');
    return res.redirect(`/admin?next=${safeNext}&error=${err}`);
  }

  const isValid = speakeasy.totp.verify({
    secret: ADMIN_OTP_SECRET,
    encoding: 'base32',
    token: otp,
    // نافذة = 2 تسمح بقبول كود OTP من الفترة السابقة أو التالية (±30 ثانية) لتسهيل الاستخدام في حال وجود فرق بسيط في الوقت بين الخادم وجهاز المستخدم
    // هذا يحسن تجربة المستخدم ويقلل من مشاكل التزامن البسيطة، مع الحفاظ على الأمان
    window: 2
  });

  if (!isValid) {
    const newTries = tries + 1;

    // If reached limit -> clear password session too (require password again)
    if (newTries >= OTP_TRIES_MAX) {
      res.setHeader('Set-Cookie', [
        buildAdminCookie('', 0),
        buildOtpCookie('', 0),
        buildOtpTriesCookie('0', 60 * 10)
      ]);

      const safeNext = encodeURIComponent(nextUrl);
      const err = encodeURIComponent('OTP غير صحيح. تم تجاوز محاولتين. الرجاء إدخال كلمة المرور مرة أخرى.');
      return res.redirect(`/admin?next=${safeNext}&error=${err}`);
    }

    // Otherwise increment tries and stay on OTP page
    res.setHeader('Set-Cookie', [
      buildOtpCookie('', 0),
      buildOtpTriesCookie(String(newTries), 60 * 10)
    ]);

    const safeNext = encodeURIComponent(nextUrl);
    const err = encodeURIComponent(`OTP غير صحيح. متبقي ${OTP_TRIES_MAX - newTries} محاولة.`);
    return res.redirect(`/admin-otp?next=${safeNext}&error=${err}`);
  }

  // OTP OK: set OTP session and clear tries
  res.setHeader('Set-Cookie', [
    buildOtpCookie('1', OTP_SESSION_SECONDS),
    buildOtpTriesCookie('0', 60 * 10)
  ]);

  return res.redirect(nextUrl);
});

app.post('/admin-logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    buildAdminCookie('', 0),
    buildOtpCookie('', 0),
    buildOtpTriesCookie('0', 60 * 10)
  ]);
  return res.redirect('/admin');
});

app.get('/admin-enhanced', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-enhanced.html'));
});

app.get('/admin-enhanced.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-enhanced.html'));
});

app.get('/products-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products-admin.html'));
});

app.get('/products-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products-admin.html'));
});

app.get('/collections-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'collections-admin.html'));
});

app.get('/collections-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'collections-admin.html'));
});

app.get('/collection-edit.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'collection-edit.html'));
});

app.get('/product-edit.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-edit.html'));
});

app.get('/order-details.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order-details.html'));
});

app.get('/customers-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customers-admin.html'));
});

app.get('/customers-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customers-admin.html'));
});

app.get('/customer-view.html', (req, res) => {
  // keep backward compat but serve the correct file
  res.sendFile(path.join(__dirname, 'public', 'customers-view.html'));
});

app.get('/customers-view.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customers-view.html'));
});

app.get('/theme-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'theme-admin.html'));
});

app.get('/theme-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'theme-admin.html'));
});

app.get('/discounts-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discounts-admin.html'));
});

app.get('/discounts-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discounts-admin.html'));
});

/* =========================================
   خدمة الملفات الثابتة
========================================= */

app.use(express.static(path.join(__dirname, 'public')));

/* =========================================
   معالج الأخطاء العام
========================================= */

app.use((err, req, res, next) => {
  console.error('❌ خطأ في التطبيق:', err);

  if (res.headersSent) {
    return next(err);
  }

  // CORS errors are thrown as Error
  if (String(err?.message || '').includes('CORS')) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  res.status(500).json({
    success: false,
    error: 'حدث خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* =========================================
   معالج الـ 404
========================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'الصفحة غير موجودة'
  });
});

/* =========================================
   دالة بدء الخادم مع معالجة الأخطاء
========================================= */

async function startServer() {
  try {
    await ensureDbReady();

    const server = app.listen(PORT, HOST, () => {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║          🚀 نظام إدارة الطلبات - Smart Kids           ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║ ✅ الخادم يعمل على: http://${HOST}:${PORT}`);
      console.log('║ ✅ قاعدة البيانات جاهزة');
      console.log('║ ✅ جميع الوحدات محملة');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║ الروابط المتاحة:');
      console.log(`║ 📍 الصفحة الرئيسية: http://${HOST}:${PORT}/`);
      console.log(`║ 📊 دخول الإدارة: http://${HOST}:${PORT}/admin`);
      console.log(`║ 🔐 OTP: http://${HOST}:${PORT}/admin-otp`);
      console.log(`║ 📈 لوحة متقدمة: http://${HOST}:${PORT}/admin-enhanced`);
      console.log(`║ 🏷️ إدارة المنتجات: http://${HOST}:${PORT}/products-admin`);
      console.log(`║ 🗂️ إدارة المجموعات: http://${HOST}:${PORT}/collections-admin`);
      console.log(`║ 👥 إدارة العملاء: http://${HOST}:${PORT}/customers-admin`);
      console.log(`║ 🎨 محرر الثيم: http://${HOST}:${PORT}/theme-admin`);
      console.log(`║ 🎟️ إدارة الخصومات: http://${HOST}:${PORT}/discounts-admin`);
      console.log(`║ ✏️ تعديل/إضافة منتج: http://${HOST}:${PORT}/product-edit.html`);
      console.log(`║ 🧩 تعديل/إضافة مجموعة: http://${HOST}:${PORT}/collection-edit.html`);
      console.log(`║ 👤 عرض العميل: http://${HOST}:${PORT}/customers-view.html?id=1`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    });

    process.on('SIGINT', async () => {
      console.log('\n\n🛑 جاري إيقاف الخادم...');
      server.close(async () => {
        if (typeof db.close === 'function') {
          await db.close();
        }
        console.log('✅ تم إيقاف الخادم بنجاح');
        process.exit(0);
      });
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ خطأ غير متوقع:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ فشل في بدء الخادم:', error);
    process.exit(1);
  }
}

// شغل listen محليًا فقط
if (require.main === module) {
  startServer();
}

module.exports = app;