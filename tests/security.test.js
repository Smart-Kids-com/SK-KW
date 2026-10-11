'use strict';

const isolation = require('./security-support'); // Must precede ALL app imports.
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createClient } = require('@libsql/client');
const speakeasy = require('speakeasy');
const { hash, createAuthStore } = require('../services/admin-auth-store');
const { sanitizeNextUrl, parseCookies, isPublicApi, isAdminPage, createAdminAuth, buildAuthCookie } = require('../services/admin-auth');

const authDB = createClient({ url: process.env.AUTH_DATABASE_URL });
const storeDB = createClient({ url: process.env.DATABASE_URL });
const instances = [];
const password = process.env.ADMIN_PASSWORD_1;
const syntheticSecret = process.env.ADMIN_OTP_SECRET;
let productionModuleDB;

async function request(instance, pathname, { method = 'GET', body, jar = new Map(), headers = {} } = {}) {
  const response = await fetch(instance.origin + pathname, {
    method, redirect: 'manual',
    headers: {
      ...(jar.size ? { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') } : {}),
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...headers
    },
    body: body ? new URLSearchParams(body).toString() : undefined
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const index = pair.indexOf('=');
    if (pair.slice(index + 1)) jar.set(pair.slice(0, index), pair.slice(index + 1));
    else jar.delete(pair.slice(0, index));
  }
  return { status: response.status, headers: response.headers, body: await response.text(), jar };
}

async function passwordStep(instance = instances[0], jar = new Map(), next = '/orders-admin.html') {
  return request(instance, '/admin-login', { method: 'POST', jar, body: { password, next } });
}
async function login(instance = instances[0], jar = new Map()) {
  await passwordStep(instance, jar);
  const otp = speakeasy.totp({ secret: syntheticSecret, encoding: 'base32' });
  const response = await request(instance, '/admin-otp', { method: 'POST', jar, body: { otp, next: '/orders-admin.html' } });
  assert.equal(response.status, 302);
  assert.ok(jar.has(instance.app.locals.adminAuth.sessionName), 'OTP creates a real admin session');
  return jar;
}

before(async () => {
  // These files and all writes are under the unique test-only temporary directory.
  await authDB.executeMultiple(fs.readFileSync(path.join(__dirname, '../db/auth-schema.sql'), 'utf8'));
  productionModuleDB = require('../db/turso-manager');
  await productionModuleDB.open();
  await productionModuleDB.initializeTables();
  await storeDB.executeMultiple(`
    CREATE TABLE customers (id INTEGER PRIMARY KEY, full_name TEXT, email TEXT, phone TEXT,
      status TEXT, total_orders INTEGER DEFAULT 0, total_spent REAL DEFAULT 0,
      accepts_marketing INTEGER DEFAULT 0, marketing_opt_in INTEGER DEFAULT 0,
      city TEXT, area TEXT, last_order_at TEXT, is_blocked INTEGER DEFAULT 0,
      notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO customers (id, full_name, email, phone) VALUES (1, 'Synthetic Customer', 'fake@example.invalid', '99999999');
    INSERT INTO products (id, product_name, slug, sku, price, stock) VALUES (1, 'Synthetic Product', 'synthetic-product', 'FAKE-1', 10, 5);
  `);
  await require('../db/store-migration').migrateStore(productionModuleDB);
  for (let index = 0; index < 2; index++) {
    // Separate app/auth-store objects, same physical DB, simulating independent instances.
    delete require.cache[require.resolve('../server')];
    const app = require('../server');
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    instances.push({ app, server, origin: `http://127.0.0.1:${server.address().port}` });
  }
});

beforeEach(async () => {
  await authDB.executeMultiple('DELETE FROM admin_sessions; DELETE FROM admin_login_limits; DELETE FROM admin_totp_replay;');
});

after(async () => {
  for (const { app, server } of instances) {
    await new Promise(resolve => server.close(resolve));
    app.locals.adminAuth.close();
  }
  if (productionModuleDB) {
    const client = await productionModuleDB.ensureTursoClient();
    client.close();
  }
  authDB.close();
  storeDB.close();
  // The runner removes fixture files after this process exits (native Windows handles).
});

test('same-origin browser password and OTP requests reach authentication; foreign origins are rejected before it', async () => {
  const instance = instances[0], jar = new Map();
  const rejected = await request(instance, '/admin-login', { method: 'POST', body: { password }, headers: { Origin: 'https://attacker.example', 'X-Forwarded-Host': 'attacker.example' } });
  assert.equal(rejected.status, 403);
  assert.deepEqual(JSON.parse(rejected.body), { success: false, error: 'Forbidden' });
  assert.equal((await authDB.execute('SELECT COUNT(*) AS n FROM admin_sessions')).rows[0].n, 0);
  const first = await request(instance, '/admin-login', { method: 'POST', body: { password }, jar, headers: { Origin: instance.origin } });
  assert.equal(first.status, 302);
  assert.ok(jar.has(instance.app.locals.adminAuth.challengeName));
  const otp = speakeasy.totp({ secret: syntheticSecret, encoding: 'base32' });
  const completed = await request(instance, '/admin-otp', { method: 'POST', body: { otp }, jar, headers: { Origin: instance.origin } });
  assert.equal(completed.status, 302);
  assert.ok(jar.has(instance.app.locals.adminAuth.sessionName));
});

test('password alone grants only a short-lived challenge; OTP produces hashed shared session', async () => {
  const jar = new Map();
  const first = await passwordStep(instances[0], jar);
  const auth = instances[0].app.locals.adminAuth;
  assert.equal(first.status, 302);
  assert.ok(jar.has(auth.challengeName));
  assert.ok(!jar.has(auth.sessionName));
  assert.equal((await request(instances[1], '/api/customers', { jar })).status, 401);
  const page = await request(instances[1], '/admin-otp', { jar });
  assert.equal(page.status, 200);
  assert.ok(!page.body.includes(syntheticSecret), 'OTP secret is not in login HTML');
  assert.ok(!/otpauth:|data:image|copySecret|secretBox|Scan QR/.test(page.body));
  const otp = speakeasy.totp({ secret: syntheticSecret, encoding: 'base32' });
  const completed = await request(instances[1], '/admin-otp', { method: 'POST', jar, body: { otp, next: '/orders-admin.html' } });
  assert.equal(completed.status, 302);
  assert.equal(completed.headers.get('location'), '/orders-admin.html');
  assert.ok(!jar.has(auth.challengeName));
  assert.ok(jar.has(auth.sessionName));
  const saved = await authDB.execute("SELECT token_hash, expires_at FROM admin_sessions WHERE scope='admin'");
  assert.equal(saved.rows.length, 1);
  assert.ok(saved.rows[0].token_hash === hash(jar.get(auth.sessionName)), 'Only the token hash is persisted');
  assert.ok(Number(saved.rows[0].expires_at) > Date.now());
  const customers = await request(instances[0], '/api/customers/1', { jar });
  assert.equal(customers.status, 200);
  assert.ok(customers.body.includes('fake@example.invalid'));
  assert.equal(customers.headers.get('cache-control'), 'no-store');
  assert.ok(completed.headers.getSetCookie().some(value => value.startsWith(auth.sessionName + '=') && /HttpOnly/.test(value) && /SameSite=Strict/.test(value)));
});

test('legacy flags, random tokens and malformed cookies cannot authenticate or reveal OTP', async () => {
  const auth = instances[0].app.locals.adminAuth;
  const variants = [
    'smartkids_admin_auth=1; smartkids_admin_otp=1',
    `${auth.sessionName}=${'A'.repeat(43)}`,
    `${auth.challengeName}=1`,
    `${auth.sessionName}=%E0%A4%A`
  ];
  for (const Cookie of variants) {
    assert.equal((await request(instances[0], '/api/orders', { headers: { Cookie } })).status, 401);
    const page = await request(instances[0], '/admin-otp', { headers: { Cookie } });
    assert.equal(page.status, 302);
    assert.ok(!page.body.includes(syntheticSecret));
  }
  assert.equal((await request(instances[0], '/admin-otp', { method: 'POST', body: { otp: '123456' } })).status, 401);
  assert.equal(parseCookies({ headers: { cookie: 'a=1; a=2' } }).a, '');
});

test('server-side expiry rejects an unchanged session cookie and expired password challenge', async () => {
  const jar = await login();
  await authDB.execute("UPDATE admin_sessions SET expires_at = 0 WHERE scope = 'admin'");
  assert.equal((await request(instances[1], '/api/customers/1', { jar })).status, 401);
  assert.equal((await request(instances[0], '/orders-admin.html', { jar })).status, 302);
  jar.clear();
  await passwordStep(instances[0], jar);
  await authDB.execute("UPDATE admin_sessions SET expires_at = 0 WHERE scope = 'challenge'");
  assert.equal((await request(instances[1], '/admin-otp', { method: 'POST', jar, body: { otp: '123456' } })).status, 401);
});

test('atomic issuance accepts only one of two competing requests for the same challenge', async () => {
  const jar = new Map();
  await passwordStep(instances[0], jar);
  const otp = speakeasy.totp({ secret: syntheticSecret, encoding: 'base32' });
  const responses = await Promise.all(instances.map(instance => request(instance, '/admin-otp', {
    method: 'POST', jar: new Map(jar), body: { otp }
  })));
  const sessionName = instances[0].app.locals.adminAuth.sessionName;
  assert.equal(responses.filter(response => response.jar.has(sessionName)).length, 1);
  assert.equal((await authDB.execute("SELECT token_hash FROM admin_sessions WHERE scope='admin'")).rows.length, 1);
  assert.equal((await authDB.execute("SELECT token_hash FROM admin_sessions WHERE scope='challenge'")).rows.length, 0);
});

test('logout deletes shared session; replaying a copied cookie on another instance is denied', async () => {
  const jar = await login();
  const copied = new Map(jar);
  assert.equal((await request(instances[1], '/orders-admin.html', { jar })).status, 200);
  const logout = await request(instances[1], '/admin-logout', { method: 'POST', jar });
  assert.equal(logout.status, 302);
  assert.equal(jar.size, 0);
  assert.equal((await authDB.execute("SELECT * FROM admin_sessions WHERE scope='admin'")).rows.length, 0);
  assert.equal((await request(instances[0], '/api/customers', { jar: copied })).status, 401);
});

test('OTP challenge is single-use, accepted TOTP cannot be replayed, wrong OTP never grants admin', async () => {
  const jar = new Map();
  await passwordStep(instances[0], jar);
  const challengeCopy = new Map(jar);
  const validOtp = speakeasy.totp({ secret: syntheticSecret, encoding: 'base32' });
  let wrong = '000000';
  while (speakeasy.totp.verify({ secret: syntheticSecret, encoding: 'base32', token: wrong, window: 1 })) wrong = String(Number(wrong) + 1).padStart(6, '0');
  await request(instances[0], '/admin-otp', { method: 'POST', jar, body: { otp: wrong } });
  assert.ok(!jar.has(instances[0].app.locals.adminAuth.sessionName));
  await request(instances[0], '/admin-otp', { method: 'POST', jar, body: { otp: validOtp } });
  assert.ok(jar.has(instances[0].app.locals.adminAuth.sessionName));
  assert.equal((await request(instances[1], '/admin-otp', { method: 'POST', jar: challengeCopy, body: { otp: validOtp } })).status, 401);
  const newChallenge = new Map();
  await passwordStep(instances[1], newChallenge);
  await request(instances[1], '/admin-otp', { method: 'POST', jar: newChallenge, body: { otp: validOtp } });
  assert.ok(!newChallenge.has(instances[1].app.locals.adminAuth.sessionName), 'Used OTP cannot create another session');
});

test('all administrative reads/writes and HTML aliases reject anonymous callers', async () => {
  const reads = [
    '/api/orders', '/api/orders/1', '/api/orders/track/SK4061', '/api/orders/stats/summary',
    '/api/customers', '/api/customers/1', '/api/customers/1/orders', '/api/customers/stats/summary',
    '/api/abandoned-checkouts', '/api/abandoned-checkouts/1', '/api/abandoned-checkouts/token/fake',
    '/api/abandoned-checkouts/stats/summary', '/api/admin-dashboard/search?q=fa', '/api/admin-dashboard/summary',
    '/api/discounts', '/api/discounts/1', '/api/discounts/stats/summary', '/api/inventory', '/api/redirects-admin',
    '/api/products/stats/summary', '/api/collections/stats/summary', '/api/unknown', '/API/Customers/', '/api/customers?limit=10'
  ];
  for (const route of reads) {
    const result = await request(instances[0], route);
    assert.equal(result.status, 401, route);
    assert.ok(!result.body.includes('fake@example.invalid'), route);
  }
  assert.equal((await request(instances[0], '/api/customers', { method: 'HEAD' })).status, 401);
  for (const [route, method] of [['/api/customers/1', 'DELETE'], ['/api/theme/settings', 'PUT'], ['/api/products', 'POST'], ['/api/abandoned-checkouts/recover', 'POST']]) {
    assert.equal((await request(instances[0], route, { method, body: {} })).status, 401, route);
  }
  const pages = fs.readdirSync(path.join(__dirname, '../public')).filter(name => name.endsWith('.html') && isAdminPage({ path: '/' + name }));
  for (const name of pages) assert.equal((await request(instances[0], '/' + name)).status, 302, name);
  for (const route of ['/orders-admin', '/abandoned-checkouts-admin', '/abandoned-checkout-details.html', '/%6frders-admin.html', '/ORDERS-ADMIN.HTML', '/order-details.html/', '/orders-admin.html.', '/orders-admin.html%20', '/orders-admin.html:$DATA']) {
    assert.equal((await request(instances[0], route)).status, 302, route);
  }
});

test('storefront pages/catalog/theme and necessary public writes retain access', async () => {
  for (const route of ['/', '/products-full.html', '/product-page.html', '/cart.html', '/checkout.html', '/thank-you.html', '/header.html', '/footer.html', '/api/products?status=active', '/api/products/1', '/api/products/slug/synthetic-product', '/api/collections', '/api/theme/settings', '/api/theme/pages/home', '/api/health']) {
    assert.equal((await request(instances[0], route)).status, 200, route);
  }
  for (const route of ['/api/orders', '/api/orders/', '/api/store/discounts/validate', '/api/abandoned-checkouts/save', '/api/admin-dashboard/heartbeat', '/api/admin-dashboard/leave']) {
    const response = await request(instances[0], route, { method: 'POST', body: {} });
    assert.equal(response.status, 400, 'Public validation reached: ' + route);
  }
  assert.ok(isPublicApi({ method: 'POST', path: '/orders/' }));
});

test('password rate limits persist across instances, cookie deletion and spoofed forwarding IP', async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await request(instances[attempt % 2], '/admin-login', {
      method: 'POST', body: { password: 'wrong-synthetic-password' },
      headers: { 'X-Forwarded-For': `198.51.100.${attempt + 1}` }
    });
    assert.equal(response.status, 302);
  }
  const limited = await passwordStep(instances[1]);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const buckets = await authDB.execute("SELECT attempts FROM admin_login_limits WHERE bucket_key LIKE 'password:ip:%'");
  assert.equal(buckets.rows.length, 1);
  assert.equal(Number(buckets.rows[0].attempts), 11);
  await authDB.execute('UPDATE admin_login_limits SET resets_at = 0');
  assert.equal((await passwordStep(instances[0])).status, 302, 'Expired lockout resets on the server');
});

test('OTP attempt limits are stored on the server and cannot be reset with the old tries cookie', async () => {
  const jar = new Map();
  await passwordStep(instances[0], jar);
  for (let attempt = 0; attempt < 5; attempt++) {
    jar.set('smartkids_admin_otp_tries', '0');
    const response = await request(instances[attempt % 2], '/admin-otp', { method: 'POST', jar, body: { otp: 'invalid' } });
    assert.equal(response.status, 302);
  }
  const response = await request(instances[1], '/admin-otp', { method: 'POST', jar, body: { otp: 'invalid' } });
  assert.equal(response.status, 429);
  assert.ok(!jar.has(instances[0].app.locals.adminAuth.sessionName));
});

test('return URLs cannot leave the site, including encoded and backslash variants', async () => {
  for (const target of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/%2fevil.invalid', '/%5cevil.invalid', '/%252fevil.invalid', '/%0d%0aLocation:evil', 'javascript:alert(1)', '/a/..//evil.invalid', '/.%2e//evil.invalid', '/%2e%2e//evil.invalid']) {
    assert.equal(sanitizeNextUrl(target), '/admin-enhanced');
  }
  for (const target of ['//evil.invalid', '/%2fevil.invalid', '/a/..//evil.invalid']) {
    const response = await passwordStep(instances[0], new Map(), target);
    assert.equal(new URL(response.headers.get('location'), 'https://internal.invalid').origin, 'https://internal.invalid');
    assert.ok(response.headers.get('location').includes('next=%2Fadmin-enhanced'));
  }
  assert.equal(sanitizeNextUrl('/order-details.html?id=1'), '/order-details.html?id=1');
  const jar = await login();
  const response = await request(instances[1], '/admin?next=//evil.invalid', { jar });
  assert.equal(response.headers.get('location'), '/admin-enhanced');
});

test('production cookies are Secure and __Host-prefixed; unavailable auth fails closed without leaking errors', async () => {
  const express = require('express');
  const app = express();
  const auth = createAdminAuth({ passwords: [password], otpSecret: syntheticSecret,
    renderLogin: () => 'login', renderOtp: () => 'otp',
    env: { NODE_ENV: 'production', AUTH_DATABASE_URL: '', AUTH_SESSION_SECRET: '' }
  });
  assert.ok(auth.sessionName.startsWith('__Host-'));
  assert.ok(auth.challengeName.startsWith('__Host-'));
  const cookie = buildAuthCookie(auth.sessionName, 'synthetic', 43200, true);
  for (const flag of ['Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=43200', 'Secure']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('Domain='));
  app.use(express.urlencoded({ extended: false }));
  app.use(auth.context);
  auth.installRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await request({ origin: `http://127.0.0.1:${server.address().port}` }, '/admin-login', { method: 'POST', body: { password: 'anything' } });
    assert.equal(response.status, 503);
    assert.ok(!/AUTH_|database|SELECT|token/i.test(response.body));
  } finally { await new Promise(resolve => server.close(resolve)); auth.close(); }
});

test('credential version rotation invalidates existing sessions without changing operational secrets', async () => {
  const jar = await login();
  const auth = instances[0].app.locals.adminAuth;
  const differentConfiguration = createAuthStore({ url: process.env.AUTH_DATABASE_URL, credentialVersion: 'synthetic-rotated-version' });
  try { assert.equal(await differentConfiguration.find(jar.get(auth.sessionName), 'admin'), null); }
  finally { differentConfiguration.close(); }
});

test('missing authentication schema fails closed and runtime never creates its tables', async () => {
  const { pathToFileURL } = require('node:url');
  const url = pathToFileURL(path.join(isolation.directory, 'empty-auth.db')).href;
  const store = createAuthStore({ url, credentialVersion: 'fixture' });
  await assert.rejects(() => store.createChallenge());
  store.close();
  const check = createClient({ url });
  try {
    const result = await check.execute("SELECT name FROM sqlite_master WHERE type='table'");
    assert.equal(result.rows.length, 0);
  } finally { check.close(); }
});

test('desktop/mobile/print order output escapes hostile customer text and never places IDs in executable handlers', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/orders-admin.html'), 'utf8');
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].find(match => match[1].includes('function renderDesktopOrders'))[1];
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '' }); return elements.get(id); };
  let printed = '';
  const context = vm.createContext({
    document: { getElementById: element, addEventListener() {} },
    window: { open: () => ({ document: { open() {}, write(value) { printed = value; }, close() {} }, focus() {}, print() {} }) },
    console, URLSearchParams, setTimeout, clearTimeout
  });
  vm.runInContext(script, context);
  const hostile = '<img src=x onerror="globalThis.pwned=1"><svg onload=alert(1)> & \'"';
  context.fixture = { id: "1');alert(1);//", order_number: hostile, customer_name: hostile, notes: hostile,
    created_at: '2026-01-01', total: 10, shipping_cost: 1, status: 'pending' };
  vm.runInContext('visibleOrders = [fixture]; renderDesktopOrders(); renderMobileOrders(); printOrdersList(visibleOrders);', context);
  for (const output of [element('desktopOrdersTableBody').innerHTML, element('mobileOrdersList').innerHTML, printed]) {
    assert.ok(!output.includes('<img') && !output.includes('<svg'), 'Customer markup is not parsed as HTML');
    assert.ok(output.includes('&lt;img') && output.includes('&amp;'));
    assert.ok(!output.includes("1');alert(1);//"), 'Customer ID is not embedded in JavaScript');
  }
  assert.equal(vm.runInContext('escapeHtml(fixture.customer_name)', context), hostile.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
});

test('tests have not attempted any production database, email, Meta or external network effect', () => {
  assert.equal(isolation.blockedEffects.length, 0);
});

test('isolation actively rejects remote databases, email, Meta and external network', async () => {
  assert.throws(() => createClient({ url: 'libsql://blocked.example.invalid', authToken: 'synthetic' }), /blocked/);
  await assert.rejects(() => require('../utils/email').sendOrderEmails(), /blocked/);
  await assert.rejects(() => require('../services/meta-capi').sendMetaPurchase(), /blocked/);
  assert.throws(() => fetch('https://blocked.example.invalid'), /blocked/);
  assert.deepEqual(isolation.blockedEffects, ['database', 'email', 'meta', 'network']);
  isolation.blockedEffects.length = 0;
});
