'use strict';
// Explicit schema-only delta. No initialization, defaults/seeds or inventory reconciliation.
async function migrateActivation(db){
  const columns=await db.all('PRAGMA table_info(orders)');
  if(!columns.length)throw new Error('Expected store schema is missing');
  for(const [name,definition] of Object.entries({billing_mode:"TEXT NOT NULL DEFAULT 'same'",billing_address:"TEXT NOT NULL DEFAULT '{}'",
    payment_status:"TEXT NOT NULL DEFAULT 'pending'",abandoned_checkout_token:'TEXT',invoice_sent_at:'TEXT'})){
    if(!columns.some(row=>row.name===name))await db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
  }
  await db.run(`CREATE TABLE IF NOT EXISTS order_invoice_jobs(order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    state TEXT NOT NULL,lease_token TEXT,lease_until INTEGER,provider_id TEXT,sent_at TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  for(const sql of ['CREATE INDEX IF NOT EXISTS idx_products_status_id ON products(status,id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status_id ON orders(status,id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_abandoned_token ON orders(abandoned_checkout_token)',
    'CREATE INDEX IF NOT EXISTS idx_abandoned_status_activity ON abandoned_checkouts(status,last_activity_at)'])await db.run(sql);
  for(const event of ['INSERT','UPDATE'])await db.run(`CREATE TRIGGER IF NOT EXISTS abandoned_recover_${event.toLowerCase()}
    AFTER ${event} ON abandoned_checkouts WHEN NEW.status!='recovered'
    AND EXISTS(SELECT 1 FROM orders WHERE abandoned_checkout_token=NEW.checkout_token)
    BEGIN UPDATE abandoned_checkouts SET status='recovered',
      recovered_order_id=(SELECT CAST(id AS TEXT) FROM orders WHERE abandoned_checkout_token=NEW.checkout_token ORDER BY id LIMIT 1),
      recovered_order_number=(SELECT order_number FROM orders WHERE abandoned_checkout_token=NEW.checkout_token ORDER BY id LIMIT 1)
      WHERE id=NEW.id; END`);
  await require('./order-inventory-migration').migrateOrderInventory(db);
  await require('./order-invoice-migration').migrateOrderInvoices(db);
}
module.exports={migrateActivation};
