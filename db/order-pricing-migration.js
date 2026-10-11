'use strict';

// Explicit maintenance operation. Never called by server startup or order routes.
// Test on a disposable database; production execution needs separate authorization.
async function migrateOrderPricing(db) {
  const columns = await db.all('PRAGMA table_info(orders)');
  if (!columns.length) throw new Error('orders table is missing');
  for (const [name, definition] of Object.entries({
    discount_code: "TEXT NOT NULL DEFAULT ''", discount_type: "TEXT NOT NULL DEFAULT ''",
    discount_value: 'REAL NOT NULL DEFAULT 0', discount_amount: 'REAL NOT NULL DEFAULT 0'
  })) {
    if (!columns.some(column => column.name === name)) {
      await db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
    }
  }
}
module.exports = { migrateOrderPricing };
