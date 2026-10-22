'use strict';
// Explicit additive migration. Never run by server startup.
async function migrateDiscounts(db) {
 const columns=new Set((await db.all('PRAGMA table_info(discount_codes)')).map(r=>r.name));
 const statements=[];
 if(!(await db.all('PRAGMA table_info(orders)')).some(r=>r.name==='discount_label'))statements.push({sql:"ALTER TABLE orders ADD COLUMN discount_label TEXT NOT NULL DEFAULT ''",args:[]});
 for(const [name,definition] of Object.entries({title:"TEXT NOT NULL DEFAULT ''",method:"TEXT NOT NULL DEFAULT 'code'",archived:"INTEGER NOT NULL DEFAULT 0",rules_json:"TEXT NOT NULL DEFAULT '{}'"}))
  if(!columns.has(name))statements.push({sql:`ALTER TABLE discount_codes ADD COLUMN ${name} ${definition}`,args:[]});
 // A normalized collision requires an explicit decision; do not merge historical codes.
 const collision=await db.get('SELECT COUNT(*) n FROM (SELECT UPPER(TRIM(code)) FROM discount_codes GROUP BY UPPER(TRIM(code)) HAVING COUNT(*)>1)');
 if(Number(collision.n))throw Error('Normalized discount codes collide; resolve before migration');
 statements.push({sql:'CREATE UNIQUE INDEX IF NOT EXISTS discount_normalized_code ON discount_codes(UPPER(TRIM(code)))',args:[]});
 statements.push({sql:'CREATE INDEX IF NOT EXISTS discount_method_active ON discount_codes(method,archived,is_active)',args:[]});
 if(db.useTurso)await (await db.ensureTursoClient()).batch(statements,'write');
 else await db.transaction(async()=>{for(const s of statements)await db.run(s.sql,s.args)});
 return {addedColumns:statements.filter(s=>s.sql.startsWith('ALTER')).length};
}
module.exports={migrateDiscounts};
