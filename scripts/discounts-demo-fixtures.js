'use strict';
// Only called by isolated demo runners after security-support installs file DB guards.
async function seedDiscounts(db){
 if(!process.env.DATABASE_URL?.startsWith('file:'))throw Error('Temporary local database required');
 await require('../db/collections-editor-migration').migrateCollectionsEditor(db);await require('../db/discounts-editor-migration').migrateDiscounts(db);
 await db.run('UPDATE products SET price=10,stock=200,on_hand=200,committed=0 WHERE id=1');
 const defs=[['WELCOME','percentage',10,1,null,null,{scope:'order'},'خصم الترحيب'],['SHIP','free_shipping',0,1,null,null,{scope:'order'},'توصيل مجاني'],['PRODUCT','fixed',3,1,null,null,{scope:'products',ids:[1],minimum_quantity:2},'خصم الكتب'],['COLLECTION','percentage',20,1,null,null,{scope:'collections',ids:[1]},'خصم المجموعة'],['SCHEDULED','fixed',1,1,'2099-01-01T00:00:00Z',null,{},'Scheduled example'],['EXPIRED','fixed',1,1,null,'2000-01-01T00:00:00Z',{},'Expired example'],['DRAFT','fixed',1,0,null,null,{},'Draft example'],['AUTO','fixed',0.5,1,null,null,{},'خصم تلقائي']];
 for(const [code,type,value,is_active,starts_at,expires_at,rules,title]of defs)await db.run('INSERT INTO discount_codes(code,type,value,is_active,starts_at,expires_at,rules_json,title,method) VALUES(?,?,?,?,?,?,?,?,?)',[code,type,value,is_active,starts_at,expires_at,JSON.stringify(rules),title,code==='AUTO'?'automatic':'code']);
 for(let i=1;i<=65;i++)await db.run("INSERT INTO discount_codes(code,type,value,is_active) VALUES(?,'fixed',1,0)",['DRAFT-DEMO-'+String(i).padStart(3,'0')]);
}
module.exports={seedDiscounts};
