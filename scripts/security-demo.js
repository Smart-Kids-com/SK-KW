'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

if (!process.argv.includes('--isolated-child')) {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const resumeIndex = process.argv.indexOf('--resume-directory');
  const resumed = resumeIndex >= 0;
  const directory = resumed ? fs.realpathSync(process.argv[resumeIndex + 1]) : fs.mkdtempSync(path.join(temporaryRoot, 'sk-security-test-'));
  if (path.dirname(directory) !== temporaryRoot || !path.basename(directory).startsWith('sk-security-test-') ||
      (resumed && !['store.db', 'auth.db'].every(file => fs.statSync(path.join(directory, file)).isFile()))) {
    throw new Error('Resume requires an existing isolated demo directory');
  }
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|APPDATA|LOCALAPPDATA|HOME)$/i.test(key)));
  const child = spawn(process.execPath, [__filename, '--isolated-child', ...process.argv.slice(2)], {
    cwd: path.join(__dirname, '..'), stdio: 'inherit',
    env: { ...environment, SK_SECURITY_TEST_DIRECTORY: directory }
  });
  child.on('exit', code => {
    const resolved = fs.realpathSync(directory);
    if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith('sk-security-test-')) {
      throw new Error('Refusing cleanup outside the allocated demo directory');
    }
    if (!resumed) fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    process.exitCode = code || 0;
  });
  process.on('SIGINT', () => child.kill('SIGTERM'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} else {
  // Guard installation comes before ANY app, database, mail or Meta module.
  require('../tests/security-support');
  const log = console.log;
  console.log = (...args) => log(...args.map(value => typeof value === 'string'
    ? value.replace('اتصال بـ Turso (إنتاج)', 'اتصال بقاعدة المتجر التجريبية المحلية') : value));
  process.env.ADMIN_PASSWORD_1 = 'Local-SK-Demo!2026'; // Disposable demo credential only.
  const themeDemo = process.argv.includes('--theme');
  const productsDemo = process.argv.includes('--products');
  const discountsDemo = process.argv.includes('--discounts');
  if(discountsDemo){
    // Synthetic review only: no actual mail, Pixel or CAPI dispatch.
    const Module=require('node:module'),guardedLoad=Module._load;
    Module._load=function(name,parent,isMain){
      if(name.endsWith('/utils/email'))return {sendOrderEmails:async()=>({mock:true}),sendInvoiceEmail:async()=>({mock:true})};
      if(name.endsWith('/services/meta-capi'))return {sendMetaPurchase:async()=>({skipped:true})};
      return guardedLoad.call(this,name,parent,isMain);
    };
    process.env.STORE_SALES_PAUSED='0';
  }
  const ordersDemo = process.argv.includes('--orders');
  const collectionsEditorDemo = process.argv.includes('--collections-editor');
  if (themeDemo || productsDemo || ordersDemo || collectionsEditorDemo) process.env.STORE_SALES_PAUSED = '1';
  const destination = discountsDemo ? '/discounts-admin' : collectionsEditorDemo ? '/collections-admin' : ordersDemo ? '/orders-admin.html' : productsDemo ? '/products-admin' : themeDemo ? '/theme-admin' : '/orders-admin.html';
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex < 0 ? 4310 : Number(process.argv[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65534) throw new Error('Invalid demo port');
  process.env.PUBLIC_ORIGIN = `http://127.0.0.1:${port}`;

  async function start() {
    const resumed = process.argv.includes('--resume-directory');
    const db = resumed ? require('../db/turso-manager') : await require('./security-demo-fixtures').seedSecurityDemo();
    if (resumed) await db.open();
    if (ordersDemo && !resumed) {
      await require('./orders-demo-fixtures').seedOrders(db);
      // Presentation fixtures only; the security suite retains its literal XSS case.
      await db.run("UPDATE orders SET customer_name='عميل تجريبي' WHERE id IN (1,2)");
    }
    if (productsDemo && !resumed) await require('./products-demo-fixtures').seedProducts(db);
    if (discountsDemo && !resumed) await require('./discounts-demo-fixtures').seedDiscounts(db);
    if (productsDemo && !resumed && process.argv.includes('--collections')) await require('./products-demo-fixtures').seedCollections(db);
    if (collectionsEditorDemo && !resumed) await require('./collections-editor-demo-fixtures').seedCollectionsEditor(db);
    if (themeDemo && !resumed) {
      await db.run("INSERT INTO products(id,product_name,slug,sku,price,image_url,status,stock,on_hand,committed) VALUES(2,'منتج معاينة إضافي','demo-second','THEME-DEMO-2',8,'/sk-main-logo.webp','active',3,3,0)");
      await db.run('INSERT INTO collection_products(collection_id,product_id,sort_order) VALUES(1,2,1)');
    }
    const express = require('express');
    const app = require('../server');
    const wrapper = express();
    // Stops browser-side Pixel and all automatic external assets/network too.
    wrapper.use((req, res, next) => {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-src 'self'; object-src 'none'");
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    wrapper.get('/js/meta-pixel.js', (req, res) => res.type('js').send('window.fbq = function () {};'));
    if(discountsDemo)wrapper.get('/discounts-demo-cart',(req,res)=>res.type('html').send(`<script>localStorage.setItem('cart',JSON.stringify([{id:1,name:'كتاب تجريبي',price:10,quantity:1,image:'/sk-main-logo.webp'}]));localStorage.removeItem('cart_discount_code');location.href='/cart.html';</script>`));
    wrapper.use(app);
    const server = wrapper.listen(port, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });

    // Separate localhost helper, absent from the actual application's routes.
    const helper = express();
    helper.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'");
      next();
    });
    helper.get('/otp', (req, res) => {
      const otp = require('speakeasy').totp({ secret: process.env.ADMIN_OTP_SECRET, encoding: 'base32' });
      res.json({ otp, remainingSeconds: 30 - Math.floor(Date.now() / 1000) % 30 });
    });
    helper.get('/', (req, res) => res.type('html').send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الدخول التجريبي المحلي</title>
      <style>body{font-family:Tahoma,Arial;max-width:600px;margin:50px auto;padding:20px;background:#f5f1fb;color:#2d2340}code{display:block;background:white;padding:16px;margin:12px 0;direction:ltr;text-align:center;font-size:24px;border-radius:12px}a{color:#6a4c93}</style>
      <h1>نسخة تجريبية معزولة</h1><p>هذه بيانات وهمية للنسخة المحلية فقط. كلمة المرور وOTP مطلوبان في التطبيق.</p>
      <p>كلمة المرور التجريبية:</p><code>Local-SK-Demo!2026</code><p>رمز OTP الحالي:</p><code id="otp">جارٍ تحميل الرمز</code><p id="remaining"></p>
      <p><a href="http://127.0.0.1:${port}/admin?next=${destination}" target="_blank" rel="noopener">افتح دخول الإدارة</a></p>
      <p>إذا استُخدم الرمز قبل قليل، انتظر الرمز التالي. البيانات تُحذف عند إيقاف النسخة.</p>
      <script>async function refresh(){const r=await fetch('/otp');const d=await r.json();document.getElementById('otp').textContent=d.otp;document.getElementById('remaining').textContent='يتغير الرمز خلال '+d.remainingSeconds+' ثانية';}refresh();setInterval(refresh,1000);</script></html>`));
    const helperServer = helper.listen(port + 1, '127.0.0.1');
    await new Promise((resolve, reject) => { helperServer.once('listening', resolve); helperServer.once('error', reject); });
    console.log(`Isolated local demo: http://127.0.0.1:${port}/admin?next=${destination}`);
    console.log(`Synthetic login instructions and live OTP: http://127.0.0.1:${port + 1}/`);
    console.log(`Node ${process.version}; temporary store/auth DBs; external traffic, mail and Meta blocked.`);
    let stopping = false;
    async function stop() {
      if (stopping) return;
      stopping = true;
      server.closeAllConnections(); helperServer.closeAllConnections();
      await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => helperServer.close(resolve))]);
      app.locals.adminAuth.close();
      (await db.ensureTursoClient()).close();
      process.exit(0);
    }
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  }
  start().catch(() => { console.error('Isolated demo could not start. Check the requested loopback ports.'); process.exit(1); });
}
