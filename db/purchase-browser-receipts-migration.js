'use strict';
const sql = `CREATE TABLE IF NOT EXISTS purchase_browser_receipts (
  order_number TEXT NOT NULL,
  event_id TEXT NOT NULL CHECK(event_id = 'purchase_' || order_number),
  value REAL NOT NULL CHECK(value >= 0),
  currency TEXT NOT NULL CHECK(currency = 'KWD'),
  called_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('fbq_called','fbq_unavailable')),
  PRIMARY KEY(order_number,status)
)`;
async function migratePurchaseBrowserReceipts(db) { await db.run(sql); }
module.exports = { sql, migratePurchaseBrowserReceipts };
