'use strict';
const ready=new WeakMap();
async function assertTables(db,tables){
  let checked=ready.get(db);if(!checked){checked=new Set();ready.set(db,checked);}
  const missing=tables.filter(table=>!checked.has(table));if(!missing.length)return;
  const rows=await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${missing.map(()=>'?').join(',')})`,missing);
  if(rows.length!==missing.length){const error=new Error('تحتاج قاعدة المتجر إلى الترحيل المعتمد قبل التشغيل');error.status=503;throw error;}
  for(const table of missing)checked.add(table);
}
module.exports={assertTables};
