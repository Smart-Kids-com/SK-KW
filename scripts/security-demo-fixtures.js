'use strict';

// Fixtures for disposable local databases only. Never imported by server.js.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

async function seedSecurityDemo() {
  const auth = createClient({ url: process.env.AUTH_DATABASE_URL });
  try { await auth.executeMultiple(fs.readFileSync(path.join(__dirname, '../db/auth-schema.sql'), 'utf8')); }
  finally { auth.close(); }
  const db = require('../db/turso-manager');
  await db.open();
  await require('../db/store-migration').migrateStore(db);
  const client = await db.ensureTursoClient();
  // Synthetic records use the explicit shared schema migration.
  await client.executeMultiple(`
    INSERT INTO products (id, product_name, slug, sku, description, price, image_url, stock, category)
      VALUES (1, 'كتاب تجريبي', 'demo-book', 'DEMO-1', 'منتج وهمي للتجربة المحلية فقط', 5,
        '/sk-main-logo.webp', 20, 'كتب');
    INSERT INTO collections (id, title, slug) VALUES (1, 'مجموعة تجريبية', 'demo-collection');
    INSERT INTO collection_products (collection_id, product_id, sort_order) VALUES (1, 1, 0);
    INSERT INTO discount_codes (code, type, value, usage_limit) VALUES ('DEMO10', 'percentage', 10, 100);
    INSERT INTO customers (id, full_name, email, phone, city, total_orders, total_spent)
      VALUES (1, 'عميل تجريبي', 'demo@example.invalid', '99999999', 'الكويت', 2, 12);
  `);
  const inventory = require('../services/inventory-service');
  await inventory.ensureInventoryColumns();
  await require('../db/order-inventory-migration').migrateOrderInventory(db);
  await inventory.syncProductInventoryById(1, { on_hand: 20 });
  const names = ['عميل تجريبي', '<img src=x onerror="window.__demoXss=1"> اسم كنص آمن'];
  for (let index = 0; index < names.length; index++) {
    await db.run(`INSERT INTO orders
      (id, order_number, customer_name, customer_email, customer_phone, customer_address,
       customer_city, subtotal, shipping_cost, total, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 5, 1, 6, 'pending', ?)`,
    [index + 1, `SK-DEMO-${index + 1}`, names[index], 'demo@example.invalid', '99999999',
      'عنوان وهمي', 'الكويت', '<script>window.__demoXss=1</script> ملاحظة تجريبية']);
    await db.run(`INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES (?, '1', 'كتاب تجريبي', 5, 1)`, [index + 1]);
  }
  return db;
}

module.exports = { seedSecurityDemo };
