'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {atomicBatch}=require('../services/order-inventory');
async function migrateSupplementalStore(db){
  for(const sql of fs.readFileSync(path.join(__dirname,'supplemental-schema.sql'),'utf8').split(';').filter(sql=>sql.trim()))await db.run(sql);
  await require('./order-pricing-migration').migrateOrderPricing(db);
  const columns=await db.all('PRAGMA table_info(orders)');
  for(const [name,definition] of Object.entries({billing_mode:"TEXT NOT NULL DEFAULT 'same'",billing_address:"TEXT NOT NULL DEFAULT '{}'",
    payment_status:"TEXT NOT NULL DEFAULT 'pending'",abandoned_checkout_token:'TEXT',invoice_sent_at:'TEXT'})){
    if(!columns.some(row=>row.name===name))await db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
  }
  await db.run(`CREATE TABLE IF NOT EXISTS order_invoice_jobs(order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    state TEXT NOT NULL, lease_token TEXT, lease_until INTEGER, provider_id TEXT, sent_at TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  await db.run('CREATE INDEX IF NOT EXISTS idx_products_status_id ON products(status,id)');
  await require('./order-invoice-migration').migrateOrderInvoices(db);
  await db.run('CREATE INDEX IF NOT EXISTS idx_orders_status_id ON orders(status,id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_orders_abandoned_token ON orders(abandoned_checkout_token)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_visitor_heartbeats_last_seen ON visitor_heartbeats(last_seen_at)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_abandoned_status_activity ON abandoned_checkouts(status,last_activity_at)');
  await db.run("INSERT OR IGNORE INTO redirects(source_path,destination_path,status_code,is_active,notes) VALUES('/product-page','/products-full.html',301,1,'Old product page redirect'),('/product-page/','/products-full.html',301,1,'Old product page redirect')");
  await db.run("INSERT OR IGNORE INTO theme_pages(page_key,title) VALUES('home','Homepage')");
  for(const event of ['INSERT','UPDATE'])await db.run(`CREATE TRIGGER IF NOT EXISTS abandoned_recover_${event.toLowerCase()}
    AFTER ${event} ON abandoned_checkouts WHEN NEW.status!='recovered'
    AND EXISTS(SELECT 1 FROM orders WHERE abandoned_checkout_token=NEW.checkout_token)
    BEGIN UPDATE abandoned_checkouts SET status='recovered',
      recovered_order_id=(SELECT CAST(id AS TEXT) FROM orders WHERE abandoned_checkout_token=NEW.checkout_token ORDER BY id LIMIT 1),
      recovered_order_number=(SELECT order_number FROM orders WHERE abandoned_checkout_token=NEW.checkout_token ORDER BY id LIMIT 1)
      WHERE id=NEW.id; END`);
}
async function repairOrderItemsRelation(db){
  const references=await db.all('PRAGMA foreign_key_list(order_items)');
  if(!references.some(row=>row.table==='orders_old'))return false;
  const orphan=await db.get('SELECT COUNT(*) AS n FROM order_items i LEFT JOIN orders o ON o.id=i.order_id WHERE o.id IS NULL');
  if(Number(orphan.n))throw new Error('Orphan order items require explicit reconciliation; no rows were deleted');
  const table=await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'");
  const indexes=await db.all("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='order_items' AND sql IS NOT NULL");
  const create=table.sql.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`\[]?order_items["`\]]?/i,'CREATE TABLE order_items_repaired')
    .replace(/\borders_old\b/g,'orders');
  const columns=(await db.all('PRAGMA table_info(order_items)')).map(row=>'"'+String(row.name).replaceAll('"','""')+'"').join(',');
  await atomicBatch(db,[{sql:create},{sql:`INSERT INTO order_items_repaired(${columns}) SELECT ${columns} FROM order_items`},
    {sql:'DROP TABLE order_items'},{sql:'ALTER TABLE order_items_repaired RENAME TO order_items'},...indexes.map(row=>({sql:row.sql}))]);
  await require('./order-inventory-migration').migrateOrderInventory(db);
  return true;
}
async function migrateLegacyInventory(db){
  const products=await db.all('PRAGMA table_info(products)');
  const hadOnHand=products.some(row=>row.name==='on_hand');
  await require('../services/inventory-service').migrateInventoryColumns(db);
  if(!hadOnHand)await db.run('UPDATE products SET on_hand=MAX(0,COALESCE(stock,0)+COALESCE(committed,0)+COALESCE(unavailable,0))');
}
async function migrateStore(db){
  await db.initializeTables();
  await migrateSupplementalStore(db);
  await migrateLegacyInventory(db);
  await repairOrderItemsRelation(db);
  await require('./order-inventory-migration').migrateOrderInventory(db);
  const invalid=await db.all('PRAGMA foreign_key_check');
  if(invalid.length)throw new Error('Foreign-key violations require reconciliation before activation');
}
module.exports={migrateStore,migrateSupplementalStore,repairOrderItemsRelation,migrateLegacyInventory};
