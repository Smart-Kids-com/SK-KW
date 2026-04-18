#!/usr/bin/env node
// server.js - خادم Express الرئيسي لنظام إدارة الطلبات
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./db/turso-manager');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');
const collectionsRoutes = require('./routes/collections');
const customersRoutes = require('./routes/customers');
const themeRoutes = require('./routes/theme');

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

const ADMIN_COOKIE_NAME = 'smartkids_admin_auth';

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

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE_NAME] === '1';
}

function buildCookie(value, maxAgeSeconds) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value)}`,
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
 */
function requireAdminApiWriteAuth(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  const pathname = String(req.path || '');

  // reads
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
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
    '/theme-admin.html'
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

  if (isAdminAuthenticated(req)) {
    return res.redirect(nextUrl);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderAdminLoginPage({ next: nextUrl, error }));
});

app.get('/admin.html', (req, res) => {
  return res.redirect('/admin');
});

app.post('/admin-login', (req, res) => {
  const password = String(req.body.password || '').trim();
  const nextUrl = sanitizeNextUrl(req.body.next || '/admin-enhanced');

  if (!ADMIN_PASSWORDS.includes(password)) {
    const safeNext = encodeURIComponent(nextUrl);
    const error = encodeURIComponent('كلمة المرور غير صحيحة');
    return res.redirect(`/admin?next=${safeNext}&error=${error}`);
  }

  res.setHeader('Set-Cookie', buildCookie('1', 60 * 60 * 12));
  return res.redirect(nextUrl);
});

app.post('/admin-logout', (req, res) => {
  res.setHeader('Set-Cookie', buildCookie('', 0));
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
      console.log(`║ 📈 لوحة متقدمة: http://${HOST}:${PORT}/admin-enhanced`);
      console.log(`║ 🏷️ إدارة المنتجات: http://${HOST}:${PORT}/products-admin`);
      console.log(`║ 🗂️ إدارة المجموعات: http://${HOST}:${PORT}/collections-admin`);
      console.log(`║ 👥 إدارة العملاء: http://${HOST}:${PORT}/customers-admin`);
      console.log(`║ 🎨 محرر الثيم: http://${HOST}:${PORT}/theme-admin`);
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