'use strict';
async function migrateCollectionRanking(db){
 await require('../services/order-inventory').atomicBatch(db,[
  {sql:'CREATE INDEX IF NOT EXISTS idx_orders_sales_status ON orders(status,id)'},
  {sql:'CREATE INDEX IF NOT EXISTS idx_order_items_sales_order ON order_items(order_id,product_id,quantity)'}
 ]);
}
module.exports={migrateCollectionRanking};
