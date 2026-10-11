'use strict';
const crypto = require('node:crypto');

function checkoutIdentity(req) {
  const key = req.get('Idempotency-Key') || req.body?.checkoutKey || null;
  if (key !== null && !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
    const error = new Error('معرف محاولة الشراء غير صالح'); error.status = 400; throw error;
  }
  const body = req.body || {};
  const quantities = new Map();
  for (const item of Array.isArray(body.items) ? body.items : []) {
    const id = String(item.product_id ?? item.productId ?? '');
    quantities.set(id, (quantities.get(id) || 0) + Number(item.quantity));
  }
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([
    ...['customerName','customerEmail','customerPhone','customerAddress','customerCity','customerDistrict','notes'].map(name => body[name] ?? ''),
    String(body.discountCode || '').trim().toUpperCase(), [...quantities].sort(),
    body.billingMode || 'same', body.billingAddress || null, body.abandonedCheckoutToken || null
  ])).digest('hex');
  return { key, fingerprint };
}
async function replayCheckout(db, identity) {
  if (!identity.key) return null;
  const row = await db.get('SELECT * FROM orders WHERE checkout_key=?', [identity.key]);
  if (!row && await db.get('SELECT checkout_key FROM order_checkout_tombstones WHERE checkout_key=?', [identity.key])) {
    const error = new Error('تم حذف الطلب المرتبط بهذه المحاولة؛ لا يمكن تكرارها'); error.status = 410; throw error;
  }
  if (row && row.checkout_fingerprint !== identity.fingerprint) {
    const error = new Error('معرف محاولة الشراء مستخدم لطلب مختلف'); error.status = 409; throw error;
  }
  return row;
}
async function atomicBatch(db, statements) {
  if (db.useTurso) return (await db.ensureTursoClient()).batch(statements, 'write');
  return db.transaction(async () => {
    const results = [];
    for (const statement of statements) results.push(await db.run(statement.sql, statement.args || []));
    return results;
  });
}
async function restockOrder(db, id) {
  await atomicBatch(db, [{ sql: `UPDATE order_inventory SET state=CASE WHEN state='reserved' THEN 'released' ELSE 'restocked' END
    WHERE order_id=? AND state IN ('reserved','fulfilled')`, args: [id] }]);
}
async function updateOrderWithItems(db, id, sql, args, items) {
  const statements = [];
  if (items) {
    const columns = (await db.all('PRAGMA table_info(order_items)')).map(row => row.name);
    statements.push({ sql: 'DELETE FROM order_items WHERE order_id=?', args: [id] });
    for (const item of items) {
      const values = { order_id: id, product_id: item.product_id, product_name: item.product_name,
        product_image: item.product_image, price: item.price, product_price: item.price,
        quantity: item.quantity, subtotal: Math.round(item.price * item.quantity * 1000) / 1000 };
      const names = Object.keys(values).filter(name => columns.includes(name));
      statements.push({ sql: `INSERT INTO order_items (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`, args: names.map(name => values[name]) });
    }
  }
  statements.push({ sql, args });
  return atomicBatch(db, statements);
}
module.exports = { checkoutIdentity, replayCheckout, atomicBatch, restockOrder, updateOrderWithItems };
