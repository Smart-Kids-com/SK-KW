'use strict';
async function migrateOrderInvoices(db){
  await db.run(`CREATE TABLE IF NOT EXISTS order_invoice_versions(
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    version TEXT NOT NULL,state TEXT NOT NULL,lease_token TEXT,lease_until INTEGER,
    retry_until INTEGER,provider_id TEXT,sent_at TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(order_id,version))`);
}
module.exports={migrateOrderInvoices};
