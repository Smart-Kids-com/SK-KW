'use strict';
const crypto = require('node:crypto');
const lifetime = 60 * 60 * 1000;
function key() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw Error('Receipt signing unavailable');
  return crypto.createHmac('sha256', secret).update('purchase-browser-receipt:v1').digest();
}
function sign(text) { return crypto.createHmac('sha256', key()).update(text).digest(); }
function withReceiptProof(order) {
  // Issued only in the successful public checkout response, never by an order-number GET.
  try {
    if (!/^SK\d+$/.test(order.order_number)) return order;
    const now = Date.now();
    const text = Buffer.from(JSON.stringify({ order: order.order_number, value: Math.round(Number(order.total) * 1000),
      issued: now, expires: now + lifetime })).toString('base64url');
    return { ...order, browser_receipt_proof: text + '.' + sign(text).toString('base64url') };
  } catch { return order; } // Observability must not break checkout.
}
function validate(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).sort().join(',') !== 'called_at,currency,event_id,order_number,proof,status,value') return null;
  if (typeof body.proof !== 'string' || body.proof.length > 600 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(body.proof)) return null;
  const [text, signature] = body.proof.split('.');
  const expected = sign(text), supplied = Buffer.from(signature, 'base64url');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  let claim;
  try { claim = JSON.parse(Buffer.from(text, 'base64url').toString('utf8')); } catch { return null; }
  if (!/^SK\d+$/.test(claim.order) || claim.order !== body.order_number || body.event_id !== 'purchase_' + claim.order ||
      claim.expires <= now || claim.issued > now + 60000 || claim.expires - claim.issued !== lifetime ||
      !Number.isSafeInteger(claim.value) || typeof body.value !== 'number' || !Number.isFinite(body.value) ||
      Math.abs(body.value * 1000 - claim.value) > 0.000001 || body.currency !== 'KWD' ||
      !['fbq_called', 'fbq_unavailable'].includes(body.status) || typeof body.called_at !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(body.called_at)) return null;
  const time = Date.parse(body.called_at);
  if (!Number.isFinite(time) || time < claim.issued - 60000 || time > now + 60000) return null;
  return claim;
}
function receive(db, ensureReady) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const claim = validate(req.body);
      if (!claim) return res.status(403).json({ success: false });
      await ensureReady();
      // Authoritative order values must still match. No order or inventory writes.
      const row = await db.get('SELECT total FROM orders WHERE order_number=?', [claim.order]);
      if (!row || Math.round(Number(row.total) * 1000) !== claim.value) return res.status(403).json({ success: false });
      await db.run(`INSERT INTO purchase_browser_receipts(order_number,event_id,value,currency,called_at,status)
        VALUES(?,?,?,?,?,?) ON CONFLICT(order_number,status) DO NOTHING`,
      [claim.order, req.body.event_id, claim.value / 1000, 'KWD', req.body.called_at, req.body.status]);
      return res.sendStatus(204);
    } catch { return res.status(503).json({ success: false }); }
  };
}
function review(db) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!/^SK\d+$/.test(String(req.query.order || ''))) return res.status(400).json({ success: false });
    try {
      const data = await db.all('SELECT order_number,event_id,value,currency,called_at,status FROM purchase_browser_receipts WHERE order_number=? ORDER BY called_at', [req.query.order]);
      res.json({ success: true, data });
    } catch { res.status(503).json({ success: false }); }
  };
}
module.exports = { withReceiptProof, validate, receive, review };
