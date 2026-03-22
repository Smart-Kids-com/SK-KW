// api/index.js - Express serverless backend for Vercel
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('../db/init');
const DatabaseMigration = require('../db/migrate');
const ordersRoutes = require('../routes/orders');
const { SYSTEM_CONFIG } = require('../config/system');

// إنشاء تطبيق Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Headers مخصصة
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

// تهيئة قاعدة البيانات عند أول طلب
let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    await db.open();
    
    // تشغيل الـ migration
    const migration = new DatabaseMigration();
    try {
      await migration.open();
      await migration.migrate();
      await migration.close();
    } catch (migrationError) {
      console.warn('⚠️ Migration warning:', migrationError.message);
    }

    await db.initializeTables();
    dbInitialized = true;
    console.log('✅ Database initialized for serverless');
  } catch (err) {
    console.error('❌ Database init error:', err);
    throw err;
  }
}

// Middleware لتهيئة قاعدة البيانات
app.use(async (req, res, next) => {
  try {
    if (!dbInitialized) {
      await initializeDatabase();
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Database initialization failed'
    });
  }
});

// Routes للـ API
app.use('/api/orders', ordersRoutes);

// Route للـ Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'النظام يعمل بشكل صحيح',
    timestamp: new Date().toISOString()
  });
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
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

// للتطوير المحلي (development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || 'localhost';
  
  async function startServer() {
    try {
      await initializeDatabase();
      
      const server = app.listen(PORT, HOST, () => {
        console.log(`✅ Server running on http://${HOST}:${PORT}`);
      });

      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        server.close(async () => {
          await db.close();
          process.exit(0);
        });
      });
    } catch (err) {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }
  }

  startServer();
}

// للـ Vercel serverless
module.exports = app;
