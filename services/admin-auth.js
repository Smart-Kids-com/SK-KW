'use strict';

const crypto = require('node:crypto');
const { isIP } = require('node:net');
const speakeasy = require('speakeasy');
const { createAuthStore, hash, validToken } = require('./admin-auth-store');

function sanitizeNextUrl(value) {
  const target = String(value || '').trim();
  // Reject protocol-relative, backslash and encoded variants before URL parsing.
  if (!/^\/(?!\/)/.test(target) || /[\\\x00-\x20\x7f]/.test(target)) return '/admin-enhanced';
  try {
    const decoded = decodeURIComponent(target);
    if (/^[\/\\]{2}|[\\\x00-\x20\x7f]/.test(decoded) || /%[0-9a-f]{2}/i.test(decoded)) return '/admin-enhanced';
    const parsed = new URL(target, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid' || parsed.pathname.startsWith('//')) return '/admin-enhanced';
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return '/admin-enhanced'; }
}

function parseCookies(req) {
  const cookies = Object.create(null);
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    try {
      // Ambiguous duplicate cookies fail closed.
      cookies[key] = Object.hasOwn(cookies, key) ? '' : decodeURIComponent(part.slice(index + 1).trim());
    } catch { cookies[key] = ''; }
  }
  return cookies;
}

function isPublicApi(req) {
  const method = req.method.toUpperCase();
  // Express routing is case insensitive and accepts a trailing slash by default.
  const route = req.path.toLowerCase().replace(/\/+$/, '') || '/';
  if (method === 'OPTIONS') return true;
  if (method === 'GET' || method === 'HEAD') {
    return route === '/health' ||
      /^\/products(?:\/(?:slug\/[^/]+|\d+))?$/.test(route) ||
      /^\/collections(?:\/(?:slug\/[^/]+|\d+(?:\/products)?))?$/.test(route) ||
      route === '/theme/settings' || /^\/theme\/pages\/[a-z0-9_-]+(?:\/sections)?$/.test(route);
  }
  return method === 'POST' && [
    '/orders', '/store/discounts/validate', '/abandoned-checkouts/save',
    '/admin-dashboard/heartbeat', '/admin-dashboard/leave'
  ].includes(route);
}

const STOREFRONT_HTML = new Set([
  'index.html', 'products-full.html', 'product-page.html', 'collections.html', 'collection.html',
  'cart.html', 'checkout.html', 'thank-you.html', 'contact.html', 'about.html',
  'terms-of-service.html', 'privacy-policy.html', 'shipping-policy.html', 'refund-policy.html',
  'header.html', 'footer.html'
]);

function isAdminPage(req) {
  let pathname;
  try { pathname = decodeURIComponent(req.path).toLowerCase().replace(/\/+$/, ''); }
  catch { return true; }
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  const rawFilename = pathname.split('/').pop();
  // Windows file serving treats trailing dots/spaces and NTFS streams specially.
  const filename = rawFilename.replace(/[ .]+$/, '').split(':')[0];
  if (['admin', 'admin.html', 'admin-otp', 'admin-otp.html'].includes(filename)) return false;
  if (filename.endsWith('.html')) return !STOREFRONT_HTML.has(filename) && !/^google[a-z0-9]+\.html$/.test(filename);
  return /(?:^|\/)(?:admin-enhanced|[a-z-]+-admin|[a-z-]+-edit|[a-z-]+-details|customers?-view)$/.test(pathname);
}

function buildAuthCookie(name, value, seconds, secure) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
}

function createAdminAuth({ passwords, otpSecret, renderLogin, renderOtp, env = process.env }) {
  const secure = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const sessionName = secure ? '__Host-sk_admin_session' : 'sk_admin_session';
  const challengeName = secure ? '__Host-sk_admin_challenge' : 'sk_admin_challenge';
  let store;
  function getStore() {
    if (!store) {
      if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 32) throw new Error('Authentication configuration unavailable');
      if (secure && String(env.AUTH_DATABASE_URL || '').startsWith('file:')) throw new Error('Shared authentication storage required');
      const credentialVersion = crypto.createHmac('sha256', env.AUTH_SESSION_SECRET)
        .update(JSON.stringify([passwords, otpSecret])).digest('hex');
      store = createAuthStore({ url: env.AUTH_DATABASE_URL, authToken: env.AUTH_DATABASE_AUTH_TOKEN, credentialVersion });
    }
    return store;
  }
  const cookie = (name, value, seconds) => buildAuthCookie(name, value, seconds, secure);
  const cleared = () => [cookie(sessionName, '', 0), cookie(challengeName, '', 0),
    ...['smartkids_admin_auth', 'smartkids_admin_otp', 'smartkids_admin_otp_tries'].map(name => cookie(name, '', 0))];
  const unavailable = res => res.status(503).json({ success: false, error: 'خدمة تسجيل الدخول غير متاحة مؤقتًا' });
  const safe = handler => async (req, res, next) => {
    try { await handler(req, res, next); } catch { unavailable(res); }
  };
  function ip(req) {
    // Vercel overwrites this header; on self-hosted/local servers ignore it.
    const forwarded = env.VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
    return isIP(forwarded) ? forwarded : (req.socket.remoteAddress || 'unknown');
  }
  async function limited(req, res, phase, challenge) {
    const keys = [[`${phase}:ip:${hash(ip(req))}`, 10], [`${phase}:global`, 100]];
    if (challenge) keys.push([`otp:challenge:${hash(challenge)}`, 5]);
    for (const [key, maximum] of keys) {
      const limit = await getStore().takeLimit(key, maximum, 900);
      if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfter));
        res.status(429).json({ success: false, error: 'محاولات كثيرة. يرجى المحاولة لاحقًا' });
        return true;
      }
    }
    return false;
  }
  const authenticated = req => Boolean(req.adminSession);

  return {
    sessionName, challengeName,
    close() { if (store) store.close(); },
    context: safe(async (req, res, next) => {
      const cookies = parseCookies(req);
      req.adminSessionToken = cookies[sessionName];
      req.adminChallengeToken = cookies[challengeName];
      if (validToken(req.adminSessionToken)) req.adminSession = await getStore().find(req.adminSessionToken, 'admin');
      if (validToken(req.adminChallengeToken)) req.adminChallenge = await getStore().find(req.adminChallengeToken, 'challenge');
      if (req.adminSession || req.adminChallenge || /^\/admin(?:[-./]|$)/i.test(req.path)) res.setHeader('Cache-Control', 'no-store');
      next();
    }),
    pageGuard(req, res, next) {
      if (!isAdminPage(req)) return next();
      res.setHeader('Cache-Control', 'no-store');
      if (authenticated(req)) return next();
      res.redirect(`/admin?next=${encodeURIComponent(sanitizeNextUrl(req.originalUrl))}`);
    },
    apiGuard(req, res, next) {
      if (isPublicApi(req)) return next();
      res.setHeader('Cache-Control', 'no-store');
      if (authenticated(req)) return next();
      res.status(401).json({ success: false, error: 'هذه العملية تتطلب دخول الإدارة' });
    },
    installRoutes(app) {
      app.get(['/admin', '/admin.html'], (req, res) => {
        const next = sanitizeNextUrl(req.query.next);
        if (authenticated(req)) return res.redirect(next);
        if (req.adminChallenge) return res.redirect(`/admin-otp?next=${encodeURIComponent(next)}`);
        res.type('html').send(renderLogin({ next, error: String(req.query.error || '') }));
      });
      app.post('/admin-login', safe(async (req, res) => {
        if (await limited(req, res, 'password')) return;
        const submitted = hash(String(req.body.password || ''));
        const correct = passwords.map(password => crypto.timingSafeEqual(Buffer.from(submitted, 'hex'), Buffer.from(hash(password), 'hex'))).some(Boolean);
        const next = sanitizeNextUrl(req.body.next);
        if (!correct) return res.redirect(`/admin?next=${encodeURIComponent(next)}&error=${encodeURIComponent('بيانات الدخول غير صحيحة')}`);
        await getStore().revoke(req.adminSessionToken, req.adminChallengeToken);
        const challenge = await getStore().createChallenge();
        res.setHeader('Set-Cookie', [...cleared(), cookie(challengeName, challenge, 300)]);
        res.redirect(`/admin-otp?next=${encodeURIComponent(next)}`);
      }));
      app.get(['/admin-otp', '/admin-otp.html'], (req, res) => {
        const next = sanitizeNextUrl(req.query.next);
        if (authenticated(req)) return res.redirect(next);
        if (!req.adminChallenge) return res.redirect('/admin');
        res.type('html').send(renderOtp({ next, error: String(req.query.error || '') }));
      });
      app.post('/admin-otp', safe(async (req, res) => {
        if (!req.adminChallenge) return res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول أولًا' });
        if (await limited(req, res, 'otp', req.adminChallengeToken)) return;
        const token = String(req.body.otp || '').trim();
        const time = Date.now();
        const match = /^\d{6}$/.test(token) && speakeasy.totp.verifyDelta({ secret: otpSecret, encoding: 'base32', token, window: 1, time: time / 1000 });
        const next = sanitizeNextUrl(req.body.next);
        const session = match && await getStore().completeChallenge(req.adminChallengeToken, Math.floor(time / 30000) + match.delta);
        if (!session) return res.redirect(`/admin-otp?next=${encodeURIComponent(next)}&error=${encodeURIComponent('رمز التحقق غير صحيح أو مستخدم سابقًا')}`);
        res.setHeader('Set-Cookie', [...cleared(), cookie(sessionName, session, 12 * 60 * 60)]);
        res.redirect(next);
      }));
      app.post('/admin-logout', safe(async (req, res) => {
        await getStore().revoke(req.adminSessionToken, req.adminChallengeToken);
        res.setHeader('Set-Cookie', cleared());
        res.redirect('/admin');
      }));
    }
  };
}

module.exports = { createAdminAuth, sanitizeNextUrl, parseCookies, isPublicApi, isAdminPage, buildAuthCookie };
