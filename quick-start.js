#!/usr/bin/env node
// quick-start.js - بدء سريع للنظام

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║    🚀 نظام إدارة الطلبات - Smart Kids Kuwait         ║');
console.log('║                   البدء السريع                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// التحقق من وجود node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  لم يتم العثور على node_modules');
  console.log('📦 جاري تثبيت المكتبات المطلوبة...\n');

  const npm = spawn('npm', ['install'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  npm.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ فشل في تثبيت المكتبات');
      process.exit(1);
    }
    console.log('\n✅ تم تثبيت المكتبات بنجاح');
    startServer();
  });
} else {
  startServer();
}

/**
 * بدء الخادم
 */
function startServer() {
  console.log('\n🔧 جاري بدء الخادم...\n');

  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  server.on('error', (err) => {
    console.error('❌ خطأ في تشغيل الخادم:', err);
  });

  // التعامل مع إيقاف البرنامج
  process.on('SIGINT', () => {
    console.log('\n\n🛑 إيقاف الخادم...');
    server.kill();
    process.exit(0);
  });
}
