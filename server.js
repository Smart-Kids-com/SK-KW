#!/usr/bin/env node
// server.js - خادم مستقل ثابت
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 بدء تشغيل نظام Smart Kids...');

function startServer() {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  server.on('close', (code) => {
    console.log(`\n❌ الخادم توقف بكود: ${code}`);
    console.log('🔄 إعادة تشغيل خلال 3 ثواني...\n');
    
    setTimeout(() => {
      startServer();
    }, 3000);
  });

  server.on('error', (err) => {
    console.error('❌ خطأ في الخادم:', err);
    console.log('🔄 إعادة تشغيل خلال 5 ثواني...\n');
    
    setTimeout(() => {
      startServer();
    }, 5000);
  });

  // التعامل مع إيقاف النظام
  process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف النظام...');
    server.kill();
    process.exit(0);
  });
}

startServer();