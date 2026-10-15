'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/activation-rehearsal-results.json')));
const root=fs.realpathSync(manifest.backupDirectory);
assert.equal(path.dirname(root),fs.realpathSync(require('node:os').tmpdir()));assert.match(path.basename(root),/^SK-KW-production-backup-/);
const source=path.join(root,'sql-artifact-verification.db');
const target=path.join(root,'opening-settlement-'+Date.now()+'.db');fs.copyFileSync(source,target);
const db=new DatabaseSync(target);db.exec('PRAGMA foreign_keys=ON');
const adapter={all:async(sql,args=[])=>db.prepare(sql).all(...args),get:async(sql,args=[])=>db.prepare(sql).get(...args),run:async(sql,args=[])=>db.prepare(sql).run(...args)};
const {settleOpeningInventory}=require('../services/opening-inventory-settlement');
const state=()=>JSON.stringify({products:db.prepare('SELECT id,on_hand,committed,unavailable,stock FROM products ORDER BY id').all(),ledger:db.prepare('SELECT * FROM order_inventory ORDER BY order_id,product_id').all()});
async function transaction(work){db.exec('BEGIN IMMEDIATE');try{const result=await work();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
(async()=>{
  const approval={catalog:await adapter.all('SELECT id,sku FROM products ORDER BY id'),items:await adapter.all('SELECT order_id,CAST(product_id AS TEXT) AS product_id,SUM(quantity) AS quantity FROM order_items GROUP BY order_id,product_id ORDER BY order_id,product_id')};
  assert.equal(new Set(approval.items.map(row=>row.order_id)).size,3);assert.equal(approval.items.reduce((n,row)=>n+row.quantity,0),4);
  fs.writeFileSync(path.join(__dirname,'../db/opening-inventory-approval.json'),JSON.stringify(approval,null,2)+'\n');
  const unchanged=state();let runs=0;
  await assert.rejects(()=>transaction(()=>settleOpeningInventory({...adapter,run:async(...args)=>{if(++runs===7)throw new Error('Synthetic failure');return adapter.run(...args);}},approval)));
  assert.equal(state(),unchanged);
  const result=await transaction(()=>settleOpeningInventory(adapter,approval));
  const products=await adapter.all('SELECT sku,on_hand,committed,unavailable,stock FROM products ORDER BY id');
  for(const product of products){assert.equal(product.on_hand,50);assert.equal(product.stock,product.sku==='audio-books'?48:['SKU-014','SKU-024'].includes(product.sku)?49:50);}
  const opening=state();assert.equal((await transaction(()=>settleOpeningInventory(adapter,approval))).replayed,true);assert.equal(state(),opening);
  db.exec('SAVEPOINT lifecycle');
  for(const orderId of new Set(approval.items.map(row=>row.order_id))){await adapter.run("UPDATE orders SET status='shipped' WHERE id=?",[orderId]);await adapter.run("UPDATE orders SET status='shipped' WHERE id=?",[orderId]);}
  for(const product of await adapter.all('SELECT sku,on_hand,committed,stock FROM products')){assert.equal(product.committed,0);assert.equal(product.on_hand,product.stock);}
  const fulfilled=state();assert.equal((await settleOpeningInventory(adapter,approval)).replayed,true);assert.equal(state(),fulfilled);
  db.exec('ROLLBACK TO lifecycle; RELEASE lifecycle');assert.equal(state(),opening);
  db.exec('SAVEPOINT cancellation');
  await adapter.run("UPDATE orders SET status='cancelled'");await adapter.run("UPDATE orders SET status='cancelled'");
  assert.ok((await adapter.all('SELECT stock,committed FROM products')).every(row=>row.stock===50&&row.committed===0));
  db.exec('ROLLBACK TO cancellation; RELEASE cancellation');assert.equal(state(),opening);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  // Separate case: completed before opening => consumed stock, never reserved or deducted again.
  const completedFile=path.join(root,'opening-completed-'+Date.now()+'.db');fs.copyFileSync(source,completedFile);
  const completed=new DatabaseSync(completedFile);completed.exec("PRAGMA foreign_keys=ON; UPDATE orders SET status='completed'; BEGIN IMMEDIATE");
  const completedAdapter={all:async(sql,args=[])=>completed.prepare(sql).all(...args),get:async(sql,args=[])=>completed.prepare(sql).get(...args),run:async(sql,args=[])=>completed.prepare(sql).run(...args)};
  await settleOpeningInventory(completedAdapter,approval);completed.exec('COMMIT');
  const completedBefore=JSON.stringify(completed.prepare('SELECT id,on_hand,committed,stock FROM products ORDER BY id').all());
  assert.ok(completed.prepare('SELECT committed,on_hand,stock FROM products').all().every(row=>row.committed===0&&row.on_hand===row.stock));
  completed.exec("UPDATE orders SET status='completed'");await settleOpeningInventory(completedAdapter,approval);
  assert.equal(JSON.stringify(completed.prepare('SELECT id,on_hand,committed,stock FROM products ORDER BY id').all()),completedBefore);completed.close();
  const mixedFile=path.join(root,'opening-mixed-'+Date.now()+'.db');fs.copyFileSync(source,mixedFile);
  const mixed=new DatabaseSync(mixedFile);mixed.exec('PRAGMA foreign_keys=ON');
  mixed.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(approval.items[0].order_id);
  const mixedAdapter={all:async(sql,args=[])=>mixed.prepare(sql).all(...args),get:async(sql,args=[])=>mixed.prepare(sql).get(...args),run:async(sql,args=[])=>mixed.prepare(sql).run(...args),begin:async()=>mixed.exec('BEGIN IMMEDIATE'),commit:async()=>mixed.exec('COMMIT'),rollback:async()=>mixed.exec('ROLLBACK'),close:async()=>{}};
  const {applyApprovedOpening}=require('./apply-opening-inventory');await applyApprovedOpening(mixedAdapter,approval);
  assert.equal(JSON.stringify(mixed.prepare('SELECT sku,stock FROM products ORDER BY id').all()),JSON.stringify(products.map(row=>({sku:row.sku,stock:row.stock}))));
  const mixedBefore=JSON.stringify(mixed.prepare('SELECT id,on_hand,committed,stock FROM products ORDER BY id').all());
  assert.equal((await applyApprovedOpening(mixedAdapter,approval)).replayed,true);
  assert.equal(JSON.stringify(mixed.prepare('SELECT id,on_hand,committed,stock FROM products ORDER BY id').all()),mixedBefore);mixed.close();
  const changedFile=path.join(root,'opening-changed-'+Date.now()+'.db');fs.copyFileSync(source,changedFile);
  const changed=new DatabaseSync(changedFile);changed.exec('UPDATE order_items SET quantity=quantity+1 WHERE id=(SELECT MIN(id) FROM order_items)');
  const changedAdapter={all:async(sql,args=[])=>changed.prepare(sql).all(...args),get:async(sql,args=[])=>changed.prepare(sql).get(...args),run:async(sql,args=[])=>changed.prepare(sql).run(...args),begin:async()=>changed.exec('BEGIN IMMEDIATE'),commit:async()=>changed.exec('COMMIT'),rollback:async()=>changed.exec('ROLLBACK'),close:async()=>{}};
  await assert.rejects(()=>applyApprovedOpening(changedAdapter,approval));
  assert.equal(changed.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='inventory_opening_settlements'").get().n,0);changed.close();
  const backup=path.join(root,'production-snapshot.db');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),manifest.sha256);
  const summary={...result,localDatabase:target,tests:['opening target balances','transaction failure rollback','repeat settlement','fulfillment once without second availability deduction','cancellation once','completed before opening','mixed fulfilled and pending through activation entry','changed approval refuses and rolls back','integrity and foreign keys','backup unchanged'],products};
  fs.writeFileSync(path.join(__dirname,'../docs/opening-inventory-results.json'),JSON.stringify(summary,null,2)+'\n');
  db.close();console.log(JSON.stringify({products:result.products,orders:result.orders,units:result.units,tests:summary.tests,localDatabase:target}));
})().catch(()=>{db.close();console.error('Opening settlement local test failed; details suppressed to protect operational data.');process.exitCode=1;});
