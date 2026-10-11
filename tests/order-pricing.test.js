'use strict';

const isolation = require('./security-support'); // BEFORE all application imports.
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { seedSecurityDemo } = require('../scripts/security-demo-fixtures');
const { migrateOrderPricing } = require('../db/order-pricing-migration');
const db = require('../db/turso-manager');
const { priceOrder } = require('../services/order-pricing');
const { savePricedOrder } = require('../services/order-storage');
const { createClient } = require('@libsql/client');
let app, server, origin;
const payload = overrides => ({
  customerName: 'Synthetic customer', customerEmail: 'order@example.invalid', customerPhone: '99999999',
  customerAddress: 'Synthetic address', customerDistrict: 'الكويت',
  items: [{ productId: '1', quantity: 2, price: 5 }], ...overrides
});
async function create(body) {
  const response = await fetch(origin + '/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return { status: response.status, result: await response.json() };
}
async function assertSaved(body, expected) {
  const response = await create(body);
  assert.equal(response.status, 201, JSON.stringify(response.result));
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [response.result.data.id]);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(order[key], value, key);
    assert.equal(response.result.data[key], value, 'response ' + key);
  }
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  assert.equal(items.length, 1);
  assert.equal(items[0].price ?? items[0].product_price, 5);
  assert.equal(items[0].product_name, (await db.get('SELECT product_name FROM products WHERE id=1')).product_name);
  return order;
}
before(async () => {
  await seedSecurityDemo();
  // Exercise the explicit migration on the actual incomplete schema, retaining data.
  for (const name of ['discount_code', 'discount_type', 'discount_value', 'discount_amount']) {
    await db.run(`ALTER TABLE orders DROP COLUMN ${name}`);
  }
  const existing = await db.all('SELECT id, total FROM orders');
  await migrateOrderPricing(db);
  await migrateOrderPricing(db); // repeatable, no duplicate-column failure
  assert.deepEqual(await db.all('SELECT id, total FROM orders'), existing);
  await db.run(`INSERT INTO discount_codes (code,type,value) VALUES ('FIXED','fixed',3)`);
  const wrapper = require('express')();
  wrapper.use((req,res,next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; form-action 'self'; frame-src 'none'; object-src 'none'"); next();
  });
  wrapper.get('/js/meta-pixel.js', (req,res) => res.type('js').send('window.fbq=function(){};'));
  server = wrapper.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  process.env.PUBLIC_ORIGIN = origin;
  app = require('../server');
  wrapper.use(app);
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  app?.locals.adminAuth.close();
  (await db.ensureTursoClient()).close();
});
beforeEach(async () => { await db.run('UPDATE products SET on_hand=100, committed=0, unavailable=0, stock=100 WHERE id=1'); });

test('valid integrated checkout persists canonical prices, percentage discount and shipping', async () => {
  await assertSaved(payload({ discountCode: ' demo10 ' }), {
    subtotal: 10, discount_code: 'DEMO10', discount_type: 'percentage', discount_value: 10,
    discount_amount: 1, shipping_cost: 2, total: 11
  });
});
test('browser price, name, image, subtotal and total cannot alter the stored order', async () => {
  for (const price of [0, -100, 999999, 'not-a-number']) {
    await assertSaved(payload({ subtotal: 0, total: -500,
      items: [{ productId: 1, quantity: 2, price, name: 'Forged name', image: 'https://invalid.invalid' }] }),
    { subtotal: 10, discount_amount: 0, shipping_cost: 2, total: 12 });
  }
});
test('forged discount amount/type/value without a valid code gives no discount', async () => {
  await assertSaved(payload({ discountAmount: 999, discountType: 'percentage', discountValue: 100 }),
    { subtotal: 10, discount_amount: 0, discount_code: '', shipping_cost: 2, total: 12 });
  await assertSaved(payload({ discountCode: 'FIXED', discountAmount: 999, discountValue: 100 }),
    { subtotal: 10, discount_amount: 3, discount_type: 'fixed', discount_value: 3, total: 9 });
});
test('forged shipping is ignored; free shipping uses subtotal before discounts', async () => {
  for (const shippingCost of [0, -100, 99999]) {
    await assertSaved(payload({ shippingCost }), { shipping_cost: 2, total: 12 });
  }
  await assertSaved(payload({ items: [{ productId: 1, quantity: 4, price: 0 }],
    shippingCost: 999, discountCode: 'DEMO10' }),
  { subtotal: 20, discount_amount: 2, shipping_cost: 0, total: 18 });
});
test('invalid, disabled, expired, future, exhausted and below-minimum codes do not save orders', async () => {
  const initial = Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n);
  const rows = [
    ['DISABLED', 0, null, null, null, 0, 0],
    ['EXPIRED', 1, null, '2000-01-01', null, 0, 0],
    ['FUTURE', 1, '2100-01-01', null, null, 0, 0],
    ['EXHAUSTED', 1, null, null, 1, 1, 0],
    ['MINIMUM', 1, null, null, null, 0, 20]
  ];
  for (const row of rows) await db.run(`INSERT INTO discount_codes
    (code,is_active,starts_at,expires_at,usage_limit,used_count,minimum_order_amount,type,value)
    VALUES (?,?,?,?,?,?,?,'percentage',10)`, row);
  for (const discountCode of ['UNKNOWN', ...rows.map(row => row[0])]) {
    assert.equal((await create(payload({ discountCode, subtotal: 10000, discountAmount: 10000 }))).status, 400);
  }
  assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n), initial);
});
test('unknown products and invalid quantities are rejected; duplicate lines share one stock check', async () => {
  for (const item of [{ productId: 999, quantity: 1 }, { productId: 1, quantity: 0 },
    { productId: 1, quantity: -1 }, { productId: 1, quantity: 1.5 }, { productId: 'manual', quantity: 1 }]) {
    assert.equal((await create(payload({ items: [item] }))).status, 400);
  }
  await db.run('UPDATE products SET on_hand=20, stock=20 WHERE id=1');
  assert.equal((await create(payload({ items: [{ productId: 1, quantity: 15 }, { productId: 1, quantity: 15 }] }))).status, 400);
  await assertSaved(payload({ items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }] }), { subtotal: 10, total: 12 });
});
test('database sale price follows existing storefront rule and KWD precision', async () => {
  await db.run('UPDATE products SET price=6.125, sale_price=5.111 WHERE id=1');
  const result = await create(payload({ discountCode: 'DEMO10' }));
  assert.equal(result.status, 201);
  assert.equal(result.result.data.items[0].price, 5.111);
  assert.equal(result.result.data.subtotal, 10.222);
  assert.equal(result.result.data.discount_amount, 1.022);
  assert.equal(result.result.data.total, 11.2);
  await db.run('UPDATE products SET price=5, sale_price=10 WHERE id=1');
  await assertSaved(payload(), { subtotal: 10, total: 12 });
  await db.run('UPDATE products SET sale_price=0 WHERE id=1');
});
test('legacy item schema saves its required product_price and subtotal columns', async () => {
  await db.run('ALTER TABLE order_items RENAME TO test_original_items');
  try {
    await db.run(`CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL, product_name TEXT NOT NULL, product_price REAL NOT NULL,
      quantity INTEGER NOT NULL, subtotal REAL NOT NULL)`);
    for (const name of ['order_inventory_insert_guard','order_inventory_reserve','order_inventory_item_delete']) await db.run(`DROP TRIGGER ${name}`);
    await require('../db/order-inventory-migration').migrateOrderInventory(db);
    const order = await assertSaved(payload(), { subtotal: 10, total: 12 });
    const item = await db.get('SELECT * FROM order_items WHERE order_id=?', [order.id]);
    assert.equal(item.product_price, 5);
    assert.equal(item.subtotal, 10);
    assert.equal(Number((await db.get('SELECT committed FROM products WHERE id=1')).committed),2);
  } finally {
    await db.run('DROP TABLE order_items');
    await db.run('ALTER TABLE test_original_items RENAME TO order_items');
    await require('../db/order-inventory-migration').migrateOrderInventory(db);
  }
});
test('a final coupon use cannot be consumed twice by concurrent checkouts', async () => {
  await db.run("INSERT INTO discount_codes (code,type,value,usage_limit) VALUES ('LASTUSE','fixed',1,1)");
  const results = await Promise.all([create(payload({ discountCode: 'LASTUSE' })), create(payload({ discountCode: 'LASTUSE' }))]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 400]);
  assert.equal(Number((await db.get("SELECT used_count FROM discount_codes WHERE code='LASTUSE'")).used_count), 1);
  assert.equal(Number((await db.get("SELECT COUNT(*) AS n FROM orders WHERE discount_code='LASTUSE'")).n), 1);
});
test('a failed item insert rolls back the order and coupon counter together', async () => {
  const count = Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n);
  const used = Number((await db.get("SELECT used_count FROM discount_codes WHERE code='FIXED'")).used_count);
  await db.run("CREATE TRIGGER test_reject_item BEFORE INSERT ON order_items BEGIN SELECT RAISE(ABORT,'synthetic insert failure'); END");
  try { assert.equal((await create(payload({ discountCode: 'FIXED' }))).status, 500); }
  finally { await db.run('DROP TRIGGER test_reject_item'); }
  assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n), count);
  assert.equal(Number((await db.get("SELECT used_count FROM discount_codes WHERE code='FIXED'")).used_count), used);
});
test('fixed discount never exceeds subtotal and cannot remove shipping', async () => {
  await db.run("INSERT INTO discount_codes (code,type,value) VALUES ('CAPPED','fixed',100)");
  await assertSaved(payload({ discountCode: 'CAPPED' }), { subtotal: 10, discount_amount: 10, shipping_cost: 2, total: 2 });
});
test('missing order columns fail without saving orders or running a migration in the route', async () => {
  const count = Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n);
  await db.run('ALTER TABLE orders DROP COLUMN discount_type');
  try {
    assert.equal((await create(payload())).status, 500);
    assert.ok(!(await db.all('PRAGMA table_info(orders)')).some(row => row.name === 'discount_type'));
    assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n), count);
  } finally { await migrateOrderPricing(db); }
});
test('duplicate product lines reserve the combined quantity once', async () => {
  await assertSaved(payload({ items: [{ productId: 1, quantity: 2 }, { productId: 1, quantity: 3 }] }), { subtotal: 25, shipping_cost: 0, total: 25 });
  const stock = await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1');
  assert.deepEqual({ ...stock }, { on_hand: 100, committed: 5, stock: 95 });
});
test('concurrent buyers cannot reserve more than the available stock', async () => {
  await db.run('UPDATE products SET on_hand=5, stock=5 WHERE id=1');
  const results = await Promise.all(Array.from({ length: 12 }, () => create(payload({ items: [{ productId: 1, quantity: 2 }] }))));
  assert.equal(results.filter(row => row.status === 201).length, 2);
  assert.equal(results.filter(row => row.status === 400).length, 10);
  assert.deepEqual({ ...(await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')) }, { on_hand: 5, committed: 4, stock: 1 });
});
test('reservations are enforced across independent database clients, not process memory', async () => {
  await db.run('UPDATE products SET on_hand=2,stock=2 WHERE id=1');
  const second = createClient({ url: process.env.DATABASE_URL });
  const otherDB = { useTurso: true, ensureTursoClient: async () => second,
    all: async (sql,args=[]) => (await second.execute({sql,args})).rows,
    get: async (sql,args=[]) => (await second.execute({sql,args})).rows[0] };
  try {
    const pricing = await priceOrder(db, payload().items, '');
    const record = { order_number: 'CLIENT-ONE', customer_name: 'Dummy', customer_email: 'dummy@example.invalid',
      customer_phone: '99999999', customer_address: 'Dummy', subtotal: pricing.subtotal, total: pricing.total, status: 'pending' };
    const results = await Promise.allSettled([
      savePricedOrder(db, record, pricing.items, pricing),
      savePricedOrder(otherDB, { ...record, order_number: 'CLIENT-TWO' }, pricing.items, pricing)
    ]);
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(Number((await db.get('SELECT committed FROM products WHERE id=1')).committed), 2);
  } finally { second.close(); }
});
test('retrying the same checkout key creates one order, coupon use and reservation', async () => {
  const body = payload({ checkoutKey: 'synthetic_checkout_retry_123', discountCode: 'DEMO10' });
  const beforeUsed = Number((await db.get("SELECT used_count FROM discount_codes WHERE code='DEMO10'")).used_count);
  const results = await Promise.all([create(body),create(body),create(body)]);
  assert.equal(results.filter(row => row.status===201).length, 1);
  assert.equal(results.filter(row => row.status===200).length, 2);
  assert.equal(new Set(results.map(row => row.result.data.id)).size, 1);
  assert.equal(Number((await db.get('SELECT committed FROM products WHERE id=1')).committed), 2);
  assert.equal(Number((await db.get("SELECT used_count FROM discount_codes WHERE code='DEMO10'")).used_count), beforeUsed+1);
  assert.equal((await create({ ...body, customerName: 'Different customer' })).status, 409);
});
async function adminSession() {
  const cookieJar = new Map();
  for (const [endpoint, values] of [
    ['/admin-login', { password: process.env.ADMIN_PASSWORD_1, next: '/orders-admin.html' }],
    ['/admin-otp', { otp: require('speakeasy').totp({ secret: process.env.ADMIN_OTP_SECRET, encoding: 'base32' }), next: '/orders-admin.html' }]
  ]) {
    const response = await fetch(origin+endpoint, { method: 'POST',redirect:'manual',
      headers: { 'Content-Type':'application/x-www-form-urlencoded', Cookie: [...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ') },
      body: new URLSearchParams(values) });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      value ? cookieJar.set(name,value) : cookieJar.delete(name);
    }
  }
  assert.ok(cookieJar.has('sk_admin_session'));
  return [...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ');
}
test('integrated cancel, fulfill, restock, status, editing and deletion are repeat safe', async () => {
  const cookie = await adminSession();
  const action = async (id, path, method='POST', body) => fetch(`${origin}/api/orders/${id}${path}`, {
    method, headers: { Cookie:cookie,'Content-Type':'application/json' }, body: body ? JSON.stringify(body) : undefined
  });
  const stock = async () => ({ ...(await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')) });
  const first = (await create(payload())).result.data.id;
  await Promise.all([action(first,'/cancel'),action(first,'/cancel')]);
  assert.deepEqual(await stock(), { on_hand:100,committed:0,stock:100 });
  assert.equal((await action(first,'/fulfill')).status, 409); // terminal transition rolls back
  const second = (await create(payload())).result.data.id;
  await Promise.all([action(second,'/fulfill'),action(second,'/fulfill')]);
  assert.deepEqual(await stock(), { on_hand:98,committed:0,stock:98 });
  await action(second,'/cancel');
  assert.deepEqual(await stock(), { on_hand:98,committed:0,stock:98 });
  await Promise.all([action(second,'/restock'),action(second,'/restock')]);
  assert.deepEqual(await stock(), { on_hand:100,committed:0,stock:100 });
  const third = (await create(payload())).result.data.id;
  await action(third,'','PUT',{ items:[{ productId:1, quantity:4 }] });
  assert.deepEqual(await stock(), { on_hand:100,committed:4,stock:96 });
  await action(third,'','PUT',{ items:[{ productId:1, quantity:200 }] });
  assert.deepEqual(await stock(), { on_hand:100,committed:4,stock:96 });
  await action(third,'','DELETE');
  assert.deepEqual(await stock(), { on_hand:100,committed:0,stock:100 });
  const fourthBody = payload({ checkoutKey:'synthetic_deleted_checkout_key' });
  const fourth = (await create(fourthBody)).result.data.id;
  await action(fourth,'','PUT',{status:'completed'});
  await action(fourth,'','PUT',{status:'completed'});
  assert.deepEqual(await stock(), { on_hand:98,committed:0,stock:98 });
  await action(fourth,'','DELETE');
  assert.deepEqual(await stock(), { on_hand:98,committed:0,stock:98 });
  assert.equal((await create(fourthBody)).status,410);
});
test('multi-product stock failure rolls back earlier reservations, items and coupon usage', async () => {
  await db.run("INSERT INTO products(id,product_name,price,status,stock,on_hand,committed,unavailable,inventory_enabled,inventory_blocked) VALUES (2,'Dummy second',3,'active',0,0,0,0,1,0)");
  const beforeUsed=Number((await db.get("SELECT used_count FROM discount_codes WHERE code='DEMO10'")).used_count);
  const beforeOrders=Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n);
  const pricing=await priceOrder(db,[{productId:1,quantity:2},{productId:2,quantity:1}],'DEMO10');
  await assert.rejects(savePricedOrder(db,{order_number:'MULTI-ROLLBACK',customer_name:'Dummy',customer_email:'dummy@example.invalid',
    customer_phone:'99999999',customer_address:'Dummy',subtotal:pricing.subtotal,total:pricing.total,status:'pending'},pricing.items,pricing));
  assert.deepEqual({...await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')},{on_hand:100,committed:0,stock:100});
  assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM orders')).n),beforeOrders);
  assert.equal(Number((await db.get("SELECT used_count FROM discount_codes WHERE code='DEMO10'")).used_count),beforeUsed);
});
test('all database URLs are disposable local files; mail and Meta were blocked', () => {
  assert.ok(process.env.DATABASE_URL.startsWith('file:'));
  assert.ok(process.env.AUTH_DATABASE_URL.startsWith('file:'));
  assert.ok(isolation.blockedEffects.includes('email'));
  assert.ok(isolation.blockedEffects.includes('meta'));
  assert.ok(!isolation.blockedEffects.includes('database'));
  assert.ok(!isolation.blockedEffects.includes('network'));
});
test('complete checkout in a clean browser matches stored prices, discount, shipping and reserved inventory',
  { skip: process.env.SK_ORDER_BROWSER !== '1' }, async () => {
    await require('../scripts/check-order-browser').checkOrderBrowser(origin, db);
  });
