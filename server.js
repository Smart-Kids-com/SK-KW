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
const { SYSTEM_CONFIG } = require('./config/system');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const ADMIN_PASSWORDS = ['admin123', 'smartkids2024'];
const ADMIN_COOKIE_NAME = 'smartkids_admin_auth';

// إنشاء تطبيق Express
const app = express();

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

function requireAdminAuth(req, res, next) {
  if (isAdminAuthenticated(req)) {
    return next();
  }

  const nextUrl = encodeURIComponent(req.originalUrl || '/admin-enhanced');
  return res.redirect(`/admin?next=${nextUrl}`);
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// Headers مخصصة
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

// Routes للـ API
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);

// Route للـ Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'النظام يعمل بشكل صحيح',
    timestamp: new Date().toISOString()
  });
});

// Route للصفحات الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin-login', (req, res) => {
  const password = String(req.body.password || '').trim();
  const nextUrl = String(req.body.next || '/admin-enhanced').trim() || '/admin-enhanced';

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

app.get('/admin-enhanced', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-enhanced.html'));
});

app.get('/admin-enhanced.html', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-enhanced.html'));
});

app.get('/products-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products-admin.html'));
});

app.get('/product-edit.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product-edit.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error('❌ خطأ في التطبيق:', err);
  res.status(500).json({
    success: false,
    error: 'حدث خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// معالج الـ 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'الصفحة غير موجودة'
  });
});

/**
 * دالة بدء الخادم مع معالجة الأخطاء
 */
async function startServer() {
  try {
    // فتح الاتصال بقاعدة البيانات
    await db.open();

    // تهيئة الجداول
    await db.initializeTables();

    // بدء الخادم
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
      console.log(`║ 📊 لوحة الإدارة: http://${HOST}:${PORT}/admin`);
      console.log(`║ 📈 لوحة متقدمة: http://${HOST}:${PORT}/admin-enhanced`);
      console.log(`║ 🏷️ إدارة المنتجات: http://${HOST}:${PORT}/products-admin`);
      console.log(`║ ✏️ تعديل/إضافة منتج: http://${HOST}:${PORT}/product-edit.html`);
      console.log(`║ 🔍 تتبع الطلبات: http://${HOST}:${PORT}/track`);
      console.log('║');
      console.log('║ API Endpoints:');
      console.log(`║ GET    http://${HOST}:${PORT}/api/orders`);
      console.log(`║ GET    http://${HOST}:${PORT}/api/orders/:id`);
      console.log(`║ GET    http://${HOST}:${PORT}/api/orders/track/:orderNumber`);
      console.log(`║ POST   http://${HOST}:${PORT}/api/orders`);
      console.log(`║ PUT    http://${HOST}:${PORT}/api/orders/:id`);
      console.log(`║ DELETE http://${HOST}:${PORT}/api/orders/:id`);
      console.log('║');
      console.log(`║ GET    http://${HOST}:${PORT}/api/products`);
      console.log(`║ GET    http://${HOST}:${PORT}/api/products/:id`);
      console.log(`║ GET    http://${HOST}:${PORT}/api/products/slug/:slug`);
      console.log(`║ GET    http://${HOST}:${PORT}/api/products/stats/summary`);
      console.log(`║ POST   http://${HOST}:${PORT}/api/products`);
      console.log(`║ PUT    http://${HOST}:${PORT}/api/products/:id`);
      console.log(`║ DELETE http://${HOST}:${PORT}/api/products/:id`);
      console.log('╚════════════════════════════════════════════════════════╝\n');
    });

    // معالجة إيقاف الخادم
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 جاري إيقاف الخادم...');
      server.close(async () => {
        await db.close();
        console.log('✅ تم إيقاف الخادم بنجاح');
        process.exit(0);
      });
    });

    // معالج الأخطاء التي لم يتم التعامل معها
    process.on('uncaughtException', (err) => {
      console.error('❌ خطأ غير متوقع:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ فشل في بدء الخادم:', error);
    process.exit(1);
  }
}

// بدء التطبيق
startServer();

module.exports = app;