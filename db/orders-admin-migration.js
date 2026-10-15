'use strict';
async function migrateOrdersAdmin(db){for(const sql of [
 `CREATE TABLE IF NOT EXISTS order_admin_selections(id TEXT PRIMARY KEY,owner TEXT NOT NULL,scope TEXT NOT NULL,filters TEXT NOT NULL,max_id INTEGER NOT NULL,last_id INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0,expires_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS order_admin_selection_items(selection_id TEXT NOT NULL REFERENCES order_admin_selections(id) ON DELETE CASCADE,order_id INTEGER NOT NULL,PRIMARY KEY(selection_id,order_id))`,
 `CREATE TABLE IF NOT EXISTS order_admin_jobs(id TEXT PRIMARY KEY,selection_id TEXT NOT NULL REFERENCES order_admin_selections(id) ON DELETE CASCADE,action TEXT NOT NULL,params TEXT NOT NULL,expires_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS order_admin_job_results(job_id TEXT NOT NULL REFERENCES order_admin_jobs(id) ON DELETE CASCADE,order_id INTEGER NOT NULL,result TEXT NOT NULL,PRIMARY KEY(job_id,order_id))`,
 'CREATE INDEX IF NOT EXISTS idx_order_admin_expiry ON order_admin_selections(expires_at)',
 'CREATE INDEX IF NOT EXISTS idx_orders_admin_created_jd ON orders(julianday(created_at),id)',
 'CREATE INDEX IF NOT EXISTS idx_orders_admin_payment_id ON orders(payment_status,id)'
 ])await db.run(sql);}
module.exports={migrateOrdersAdmin};
