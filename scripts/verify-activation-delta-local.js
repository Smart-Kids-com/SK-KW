'use strict';
// Local-only artifact verification; never reads connection settings or imports the app.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/activation-rehearsal-results.json')));
const root=fs.realpathSync(manifest.backupDirectory);
assert.equal(path.dirname(root),fs.realpathSync(require('node:os').tmpdir()));assert.match(path.basename(root),/^SK-KW-production-backup-/);
const backup=path.join(root,'production-snapshot.db'),file=path.join(root,'sql-artifact-verification.db');
assert.ok(!fs.existsSync(file));fs.copyFileSync(backup,file);
const db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys=ON');
db.exec(fs.readFileSync(path.join(__dirname,'../db/activation-schema-delta.sql'),'utf8'));
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
const added=['inventory_managed','checkout_key','checkout_fingerprint','billing_mode','billing_address','payment_status','abandoned_checkout_token','invoice_sent_at'];
const columns=db.prepare('PRAGMA table_info(orders)').all();assert.ok(added.every(name=>columns.some(c=>c.name===name)));
for(const table of ['order_inventory','order_checkout_tombstones','order_invoice_jobs'])assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE inventory_managed!=0').get().n,0);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_inventory').get().n,0);
const product=db.prepare("SELECT id,on_hand,committed FROM products WHERE sku='audio-books'").get();
db.exec('BEGIN IMMEDIATE');
try{
  const order=db.prepare(`INSERT INTO orders(order_number,customer_name,customer_email,customer_phone,customer_address,subtotal,shipping_cost,total,status,inventory_managed)
    VALUES('LOCAL-REHEARSAL-ONLY','Synthetic','synthetic@example.invalid','99999999','Synthetic',5,2,7,'pending',1)`).run();
  db.prepare("INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,'Synthetic',5,2)").run(order.lastInsertRowid,String(product.id));
  assert.equal(db.prepare('SELECT committed FROM products WHERE id=?').get(product.id).committed,product.committed+2);
  db.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(order.lastInsertRowid);
  assert.equal(db.prepare('SELECT on_hand FROM products WHERE id=?').get(product.id).on_hand,product.on_hand-2);
  db.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(order.lastInsertRowid);
  assert.equal(db.prepare('SELECT on_hand FROM products WHERE id=?').get(product.id).on_hand,product.on_hand-2);
  db.prepare("UPDATE order_inventory SET state='restocked' WHERE order_id=? AND state='fulfilled'").run(order.lastInsertRowid);
  db.prepare("UPDATE order_inventory SET state='restocked' WHERE order_id=? AND state='fulfilled'").run(order.lastInsertRowid);
  assert.equal(db.prepare('SELECT on_hand FROM products WHERE id=?').get(product.id).on_hand,product.on_hand);
  const emptyOrder=db.prepare(`INSERT INTO orders(order_number,customer_name,customer_email,customer_phone,customer_address,subtotal,shipping_cost,total,status,inventory_managed)
    VALUES('LOCAL-STOCK-FAILURE','Synthetic','synthetic@example.invalid','99999999','Synthetic',5,2,7,'pending',1)`).run();
  assert.throws(()=>db.prepare("INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,'Synthetic',5,9999)").run(emptyOrder.lastInsertRowid,String(product.id)),/ORDER_STOCK_UNAVAILABLE/);
}finally{db.exec('ROLLBACK');}
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders WHERE order_number LIKE 'LOCAL-%'").get().n,0);
db.close();
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),manifest.sha256);
manifest.sqlArtifactVerified=true;manifest.localInventoryTriggersVerified=true;
fs.writeFileSync(path.join(root,'verification-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'../docs/activation-rehearsal-results.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('PASS local SQL artifact, schema constraints, zero historical reservations, reserve/fulfill/restock exactly once, insufficient-stock rejection, synthetic rollback; backup unchanged.');
