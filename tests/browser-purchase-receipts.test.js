'use strict';
const isolation = require('./security-support');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module'), load = Module._load;
let purchases = 0, mail = 0;
Module._load = function(name, parent, isMain) {
  if (name.endsWith('/services/meta-capi')) return { sendMetaPurchase: async () => { purchases++; } };
  if (name.endsWith('/utils/email')) return { sendOrderEmails: async () => { mail++; } };
  return load.call(this, name, parent, isMain);
};
const receipts = require('../services/purchase-browser-receipts');
const source = fs.readFileSync(path.join(__dirname, '../public/js/meta-pixel.js'), 'utf8');
const order = { order_number: 'SK999999', total: 20 };

test('beacon/keepalive receipts, unavailable Pixel and logging failures do not change Purchase calls', async () => {
  for (const mode of ['beacon', 'keepalive', 'unavailable', 'rejected', 'throws']) {
    const calls = [], sent = [];
    const window = { location: { search: '' }, fbq: (...args) => calls.push(args), navigator: {},
      fetch: (url, options) => { sent.push(JSON.parse(options.body)); return mode === 'rejected' ? Promise.reject(Error('synthetic offline')) : Promise.resolve({ status: 204 }); } };
    window.navigator.sendBeacon = (url, blob) => {
      if (mode === 'throws') throw Error('synthetic beacon failure');
      if (mode !== 'beacon') return false;
      sent.push(blob); return true;
    };
    const context = vm.createContext({ window, document: { readyState: 'complete', addEventListener() {} }, URLSearchParams, Blob, console: { info() {}, log() {} } });
    vm.runInContext(source, context);
    if (mode === 'unavailable') window.fbq = undefined;
    if (mode === 'throws') window.fetch = () => { throw Error('synthetic fetch failure'); };
    const proof = receipts.withReceiptProof(order).browser_receipt_proof;
    assert.doesNotThrow(() => window.SmartKidsPixel.trackPurchase({ eventId: 'purchase_SK999999', value: 20, currency: 'KWD', ids: ['3'], quantity: 1, receiptProof: proof }));
    await new Promise(resolve => setImmediate(resolve));
    const purchase = calls.filter(args => args[1] === 'Purchase');
    assert.equal(purchase.length, mode === 'unavailable' ? 0 : 1);
    if (purchase.length) {
      assert.equal(purchase[0][3].eventID, 'purchase_SK999999');
      assert(!JSON.stringify(purchase).includes(proof), 'Receipt proof must never reach Meta');
    }
    if (mode !== 'throws') {
      assert.equal(sent.length, 1);
      const body = sent[0] instanceof Blob ? JSON.parse(await sent[0].text()) : sent[0];
      assert.equal(body.status, mode === 'unavailable' ? 'fbq_unavailable' : 'fbq_called');
      assert(receipts.validate(body));
    }
  }
});

test('signed proof is scoped, expiring, amount-bound and rejects unknown/customer fields', () => {
  const body = { order_number: order.order_number, event_id: 'purchase_' + order.order_number, value: 20,
    currency: 'KWD', called_at: new Date().toISOString(), status: 'fbq_called', proof: receipts.withReceiptProof(order).browser_receipt_proof };
  assert(receipts.validate(body));
  for (const change of [{ proof: body.proof + 'x' }, { order_number: 'SK4109' }, { event_id: 'purchase_other' },
    { value: 19 }, { currency: 'USD' }, { status: 'delivered' }, { email: 'synthetic@example.invalid' },
    { called_at: new Date(Date.now() + 600000).toISOString() }]) assert.equal(receipts.validate({ ...body, ...change }), null);
  assert.equal(receipts.validate(body, Date.now() + 3600001), null);
});

test('real endpoint persists across requests, deduplicates, limits requests and never writes orders/inventory', async () => {
  const db = require('../db/turso-manager');
  await require('../scripts/security-demo-fixtures').seedSecurityDemo();
  const before = await db.all('SELECT id,total,notes FROM orders ORDER BY id');
  await require('../db/purchase-browser-receipts-migration').migratePurchaseBrowserReceipts(db);
  await require('../db/purchase-browser-receipts-migration').migratePurchaseBrowserReceipts(db);
  assert.deepEqual(await db.all('SELECT id,total,notes FROM orders ORDER BY id'), before);
  const wrapper = require('express')(), server = wrapper.listen(0, '127.0.0.1');
  await require('events').once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port; process.env.PUBLIC_ORIGIN = base; process.env.STORE_SALES_PAUSED = '0';
  const app = require('../server'); wrapper.use(app);
  try {
    const payload = { checkoutKey: 'synthetic_browser_receipt_123456', customerName: 'Synthetic', customerEmail: 'synthetic@example.invalid',
      customerPhone: '99999999', customerAddress: 'Synthetic address', items: [{ productId: 1, quantity: 1 }] };
    const create = () => fetch(base + '/api/orders', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const response = await create(); assert.equal(response.status, 201);
    const saved = (await response.json()).data; assert(saved.browser_receipt_proof);
    assert.equal((await create()).status, 200); assert.equal(purchases, 1); assert.equal(mail, 1);
    const stock = await db.all('SELECT id,on_hand,committed,stock FROM products ORDER BY id');
    const snapshot = await db.all('SELECT * FROM orders ORDER BY id');
    const body = { order_number: saved.order_number, event_id: 'purchase_' + saved.order_number, value: saved.total, currency: 'KWD',
      called_at: new Date().toISOString(), status: 'fbq_called', proof: saved.browser_receipt_proof };
    const post = (value, origin = base) => fetch(base + '/api/purchase-browser-receipt', { method: 'POST', headers: {
      ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    assert.equal((await post(body)).status, 204);
    assert.equal((await post(body)).status, 204);
    assert.equal((await post({ ...body, status: 'fbq_unavailable' })).status, 204);
    const rows = await db.all('SELECT * FROM purchase_browser_receipts'); assert.equal(rows.length, 2);
    assert(rows.every(row => Object.keys(row).sort().join(',') === 'called_at,currency,event_id,order_number,status,value'));
    assert.equal((await post({ ...body, value: 99 })).status, 403);
    assert.equal((await post({ ...body, proof: undefined })).status, 403);
    assert.equal((await post(body, '')).status, 403);
    assert.equal((await post({ ...body, extra: 'x'.repeat(3000) })).status, 413);
    const malformed = await fetch(base + '/api/purchase-browser-receipt', { method: 'POST', headers: {
      Origin: base, 'Content-Type': 'application/json' }, body: '{"proof":"synthetic-malformed' });
    assert.equal(malformed.status, 400); assert(!(await malformed.text()).includes('synthetic-malformed'));
    assert.equal((await fetch(base + '/api/orders/admin/browser-receipts?order=' + saved.order_number)).status, 401);
    const cookies = new Map();
    for (const [url, values] of [
      ['/admin-login', { password: process.env.ADMIN_PASSWORD_1 }],
      ['/admin-otp', { otp: require('speakeasy').totp({ secret: process.env.ADMIN_OTP_SECRET, encoding: 'base32' }) }]
    ]) {
      const r = await fetch(base + url, { method: 'POST', redirect: 'manual', headers: {
        Origin: base, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: [...cookies].map(([k,v]) => k + '=' + v).join('; ')
      }, body: new URLSearchParams(values) });
      assert.equal(r.status, 302);
      for (const cookie of r.headers.getSetCookie()) { const [k,v] = cookie.split(';')[0].split('='); if (v) cookies.set(k,v); else cookies.delete(k); }
    }
    const reviewed = await fetch(base + '/api/orders/admin/browser-receipts?order=' + saved.order_number, {
      headers: { Cookie: [...cookies].map(([k,v]) => k + '=' + v).join('; ') }
    });
    assert.equal(reviewed.status, 200); assert.equal((await reviewed.json()).data.length, 2);
    // The table is optional to checkout: an unavailable receipt sink must not affect the order.
    await db.run('ALTER TABLE purchase_browser_receipts RENAME TO receipt_sink_unavailable');
    assert.equal((await post(body)).status, 503);
    await db.run('ALTER TABLE receipt_sink_unavailable RENAME TO purchase_browser_receipts');
    let limited = false;
    for (let i = 0; i < 65; i++) { if ((await post(body)).status === 429) { limited = true; break; } }
    assert(limited);
    assert.deepEqual(await db.all('SELECT * FROM orders ORDER BY id'), snapshot);
    assert.deepEqual(await db.all('SELECT id,on_hand,committed,stock FROM products ORDER BY id'), stock);
    assert.equal(purchases, 1); assert.equal(mail, 1);
    assert.equal(isolation.blockedEffects.length, 0);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); app.locals.adminAuth.close();
    (await db.ensureTursoClient()).close();
  }
});
