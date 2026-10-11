#!/usr/bin/env node

// server.js - خادم Express الرئيسي لنظام إدارة الطلبات

// Tests supply an isolated environment before loading this module.
if (process.env.NODE_ENV !== 'test') require('dotenv').config();



const express = require('express');

const path = require('path');

const cors = require('cors');

const bodyParser = require('body-parser');



const { createAdminAuth } = require('./services/admin-auth');
const { isAllowedOrigin } = require('./services/request-origin');



const db = require('./db/turso-manager');

const redirectsRoutes = require('./routes/redirects');

const redirectsAdminRoutes = require('./routes/redirects-admin');

const ordersRoutes = require('./routes/orders');

const productsRoutes = require('./routes/products');

const collectionsRoutes = require('./routes/collections');

const customersRoutes = require('./routes/customers');

const themeRoutes = require('./routes/theme');

const abandonedCheckoutsRoutes = require('./routes/abandoned-checkouts');

const discountsRoutes = require('./routes/discounts');

const storeDiscountsRoutes = require('./routes/store-discounts');

const adminDashboardRoutes = require('./routes/admin-dashboard');

const inventoryRoutes = require('./routes/inventory');





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



const app = express();
app.use(require('./services/store-maintenance').storeMaintenance());

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



function renderAdminOtpPage({ next = '/admin-enhanced', error = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>رمز التحقق - Smart Kids Kuwait</title>
<style>*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;background:#f5f1fb;padding:24px;color:#2d2340}.card{max-width:460px;margin:8vh auto;background:white;padding:28px;border-radius:20px}label{display:block;margin:16px 0 8px}input,button{width:100%;padding:14px;font-size:18px;border-radius:12px}button{margin-top:16px;background:#6a4c93;color:white;border:0}.error{color:#a9353f}</style></head>
<body><main class="card"><h1>رمز التحقق</h1><p>أدخل الرمز من تطبيق المصادقة لإكمال الدخول.</p>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
<form method="POST" action="/admin-otp"><input type="hidden" name="next" value="${escapeHtml(next)}">
<label for="otp">رمز التحقق المكوّن من ستة أرقام</label><input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>
<button type="submit">تأكيد</button></form></main></body></html>`;
}

const adminAuth = createAdminAuth({
  passwords: ADMIN_PASSWORDS,
  otpSecret: ADMIN_OTP_SECRET,
  renderLogin: renderAdminLoginPage,
  renderOtp: renderAdminOtpPage
});
app.locals.adminAuth = adminAuth;

let dbReadyPromise = null;



async function ensureDbReady() {

  if (!dbReadyPromise) {

    dbReadyPromise = (async () => {

      if (typeof db.open === 'function') {

        await db.open();

      }

      await require('./db/schema-readiness').assertTables(db, ['orders','order_items','products']);

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



app.use(cors((req, callback) => callback(null, {

  origin: (origin, cb) => {

    // allow same-origin requests (no Origin header) e.g. curl, server-to-server

    if (isAllowedOrigin(req, origin, allowedOrigins)) return cb(null, true);

    return cb(new Error('Not allowed by CORS'));

  },

  credentials: true,

  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']

})));



app.use(bodyParser.json({ limit: '50mb' }));

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));



app.use((req, res, next) => {

  res.header('X-Content-Type-Options', 'nosniff');

  res.header('X-Frame-Options', 'DENY');

  next();

});



app.use(adminAuth.context);
app.use(adminAuth.pageGuard);
adminAuth.installRoutes(app);

app.use(redirectsRoutes);



/* =========================================

   صفحات الإدارة المحمية قبل static

========================================= */



// Deny private API requests before database initialization or route handlers.
app.use('/api', adminAuth.apiGuard);

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

app.use('/api/redirects-admin', redirectsAdminRoutes);

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

app.use('/api/inventory', inventoryRoutes);

app.use('/api/store/discounts', storeDiscountsRoutes);

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



app.get('/inventory-admin', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'inventory-admin.html'));

});



app.get('/inventory-admin.html', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'inventory-admin.html'));

});



app.get('/redirects-admin', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'redirects-admin.html'));

});



app.get('/redirects-admin.html', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'redirects-admin.html'));

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

        console.log(`║ 📦 إدارة المخزون: http://${HOST}:${PORT}/inventory-admin`);

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
