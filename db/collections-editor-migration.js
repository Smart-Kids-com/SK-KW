'use strict';
const {atomicBatch}=require('../services/order-inventory');
async function migrateCollectionsEditor(db){
 const columns=await db.all('PRAGMA table_info(collections)'),statements=[];
 const hadAutomatedMap=await db.get("SELECT 1 FROM sqlite_master WHERE type='table' AND name='collection_automated_products'");
 for(const [name,definition]of Object.entries({kind:"TEXT NOT NULL DEFAULT 'manual'",match_mode:"TEXT NOT NULL DEFAULT 'all'",rules_json:"TEXT NOT NULL DEFAULT '[]'",revision:'INTEGER NOT NULL DEFAULT 0',deleted_at:'TEXT'}))if(!columns.some(c=>c.name===name))statements.push({sql:`ALTER TABLE collections ADD COLUMN ${name} ${definition}`});
 statements.push({sql:'CREATE TABLE IF NOT EXISTS collection_exclusions(collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,PRIMARY KEY(collection_id,product_id))'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_automated_products(collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,PRIMARY KEY(collection_id,product_id))'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_collection_automated_product ON collection_automated_products(product_id,collection_id)'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_admin_selections(id TEXT PRIMARY KEY,owner TEXT NOT NULL,scope TEXT NOT NULL,filters TEXT NOT NULL,max_id INTEGER NOT NULL,last_id INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0,expires_at INTEGER NOT NULL)'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_admin_selection_items(selection_id TEXT NOT NULL REFERENCES collection_admin_selections(id) ON DELETE CASCADE,collection_id INTEGER NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(selection_id,collection_id))'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_admin_jobs(id TEXT PRIMARY KEY,selection_id TEXT NOT NULL REFERENCES collection_admin_selections(id),action TEXT NOT NULL,params TEXT NOT NULL)'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_admin_job_results(job_id TEXT NOT NULL REFERENCES collection_admin_jobs(id),collection_id INTEGER NOT NULL,result TEXT NOT NULL,PRIMARY KEY(job_id,collection_id))'},
 {sql:'CREATE TABLE IF NOT EXISTS collection_admin_operations(id TEXT PRIMARY KEY,owner TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_collections_editor_list ON collections(deleted_at,status,updated_at,id)'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_products_collection_category ON products(category,status,id)'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_products_collection_type ON products(product_type,status,id)'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_products_collection_vendor ON products(vendor,status,id)'},
 {sql:'CREATE INDEX IF NOT EXISTS idx_collection_admin_expiry ON collection_admin_selections(expires_at)'});
 for(const event of ['INSERT','DELETE','UPDATE']){const key=event==='DELETE'?'OLD':'NEW';statements.push({sql:`CREATE TRIGGER IF NOT EXISTS collection_membership_revision_${event.toLowerCase()} AFTER ${event} ON collection_products BEGIN UPDATE collections SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=${key}.collection_id; END`});statements.push({sql:`CREATE TRIGGER IF NOT EXISTS collection_exclusion_revision_${event.toLowerCase()} AFTER ${event} ON collection_exclusions BEGIN UPDATE collections SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=${key}.collection_id; END`});}
 const predicate=require('../services/collections-editor').rulePredicate();
 // A product write evaluates that product only, across saved automated rules.
 // Opening a page reads indexed memberships; it never rebuilds the catalog.
 for(const event of ['INSERT','UPDATE OF product_name,category,product_type,vendor,tags,status,price,sale_price,on_hand,committed,unavailable']){
   const name=event==='INSERT'?'insert':'update';
   statements.push({sql:`CREATE TRIGGER IF NOT EXISTS collection_automated_product_${name} AFTER ${event} ON products BEGIN
     DELETE FROM collection_automated_products WHERE product_id=NEW.id AND NOT EXISTS(SELECT 1 FROM collections c JOIN products p ON p.id=NEW.id WHERE c.id=collection_automated_products.collection_id AND c.kind='automated' AND ${predicate});
     INSERT OR IGNORE INTO collection_automated_products(collection_id,product_id) SELECT c.id,p.id FROM collections c JOIN products p ON p.id=NEW.id WHERE c.kind='automated' AND ${predicate}; END`});
 }
 for(const event of ['INSERT','UPDATE OF kind,rules_json,match_mode']){
   const name=event==='INSERT'?'insert':'update',guard=event==='INSERT'?'':" WHEN NEW.kind!=OLD.kind OR NEW.rules_json!=OLD.rules_json OR NEW.match_mode!=OLD.match_mode";
   statements.push({sql:`CREATE TRIGGER IF NOT EXISTS collection_automated_rules_${name} AFTER ${event} ON collections${guard} BEGIN
     DELETE FROM collection_automated_products WHERE collection_id=NEW.id;
     INSERT OR IGNORE INTO collection_automated_products(collection_id,product_id) SELECT c.id,p.id FROM products p JOIN collections c ON c.id=NEW.id WHERE c.kind='automated' AND ${predicate}; END`});
 }
 if(!hadAutomatedMap)statements.push({sql:`INSERT OR IGNORE INTO collection_automated_products(collection_id,product_id) SELECT c.id,p.id FROM collections c JOIN products p ON c.kind='automated' WHERE ${predicate}`});
 await atomicBatch(db,statements);
}
module.exports={migrateCollectionsEditor};
