'use strict';
const crypto=require('node:crypto');
const key='opening-50-20261010-v1';
const stable=rows=>JSON.stringify(rows.map(row=>Object.fromEntries(Object.entries(row).sort())).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function settleOpeningInventory(db,approval){
  const digest=hash(stable(approval.catalog)+'|'+stable(approval.items));
  await db.run(`CREATE TABLE IF NOT EXISTS inventory_opening_settlements(settlement_key TEXT PRIMARY KEY,
    approval_hash TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const existing=await db.get('SELECT approval_hash FROM inventory_opening_settlements WHERE settlement_key=?',[key]);
  if(existing){if(existing.approval_hash!==digest)throw new Error('Opening approval mismatch');return {replayed:true};}
  const catalog=await db.all('SELECT id,sku FROM products ORDER BY id');
  if(stable(catalog)!==stable(approval.catalog))throw new Error('Catalog changed since approval; refresh review');
  const orders=await db.all('SELECT id,status,inventory_managed FROM orders ORDER BY id');
  const approvedIds=new Set(approval.items.map(row=>Number(row.order_id)));
  if(orders.length!==approvedIds.size||orders.some(row=>!approvedIds.has(Number(row.id))))throw new Error('Order population changed; refresh review');
  if(orders.some(row=>!['pending','processing','shipped','completed'].includes(row.status)||Number(row.inventory_managed)!==0))throw new Error('Order state requires review');
  const items=await db.all('SELECT order_id,CAST(product_id AS TEXT) AS product_id,SUM(quantity) AS quantity FROM order_items GROUP BY order_id,product_id ORDER BY order_id,product_id');
  if(stable(items)!==stable(approval.items)||items.some(row=>!Number.isSafeInteger(row.quantity)||row.quantity<1))throw new Error('Order items changed; refresh review');
  if(Number((await db.get('SELECT COUNT(*) AS n FROM order_inventory')).n))throw new Error('Inventory ledger already populated; reconcile explicitly');
  const counts=new Map(catalog.map(row=>[String(row.id),{reserved:0,fulfilled:0}]));
  for(const item of items){
    const counter=counts.get(item.product_id);if(!counter)throw new Error('Order product missing');
    const order=orders.find(row=>Number(row.id)===Number(item.order_id));
    const state=['shipped','completed'].includes(order.status)?'fulfilled':'reserved';counter[state]+=item.quantity;
    await db.run('INSERT INTO order_inventory(order_id,product_id,quantity,state) VALUES(?,?,?,?)',[item.order_id,item.product_id,item.quantity,state]);
  }
  for(const product of catalog){
    const count=counts.get(String(product.id));if(count.reserved+count.fulfilled>50)throw new Error('Approved opening stock insufficient');
    await db.run('UPDATE products SET on_hand=?,committed=?,unavailable=0,stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [50-count.fulfilled,count.reserved,50-count.fulfilled-count.reserved,product.id]);
  }
  // Link without UPDATE status: avoids consuming already accounted fulfilled quantities.
  for(const order of orders)await db.run('UPDATE orders SET inventory_managed=1 WHERE id=?',[order.id]);
  await db.run('INSERT INTO inventory_opening_settlements(settlement_key,approval_hash) VALUES(?,?)',[key,digest]);
  return {replayed:false,products:catalog.length,orders:orders.length,units:items.reduce((n,row)=>n+row.quantity,0)};
}
module.exports={settleOpeningInventory,key};
