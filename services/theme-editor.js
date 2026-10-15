 'use strict';
const model=require('../public/js/theme-model');
const {atomicBatch}=require('./order-inventory');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function themeId(id='current'){if(!/^(current|t_[a-f0-9]{24})$/.test(id))throw fail('Invalid theme identifier');return id;}
async function state(db,id='current'){
 themeId(id);await require('../db/schema-readiness').assertTables(db,['theme_editor_documents','theme_editor_history','theme_editor_media','theme_editor_library','theme_editor_identity']);
 const live=await db.get('SELECT * FROM theme_editor_documents WHERE id=1'),meta=await db.get('SELECT * FROM theme_editor_identity WHERE id=1');
 const row=id==='current'?live:await db.get('SELECT * FROM theme_editor_library WHERE id=?',[id]);if(!row)throw fail('Theme not found',404);
 return {id,name:id==='current'?meta.name:row.name,draft:JSON.parse(row.draft_json),published:JSON.parse(live.published_json),revision:row.draft_revision,publishedRevision:live.published_revision,updatedAt:row.updated_at,publishedName:meta.published_name,publishedSource:meta.published_source};
}
async function save(db,document,revision,kind='draft',id='current'){
 themeId(id);model.validate(document);if(!Number.isSafeInteger(revision)||revision<0)throw fail('Invalid draft revision');
 const text=JSON.stringify(document),published=kind==='publish',s=await state(db,id),table=id==='current'?'theme_editor_documents':'theme_editor_library',key=id==='current'?1:id;
 const statements=[{sql:`UPDATE ${table} SET draft_json=?,draft_revision=draft_revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND draft_revision=?`,args:[text,key,revision]},
 {sql:'INSERT INTO theme_editor_history(kind,document_json,theme_id) SELECT ?,?,? WHERE changes()=1',args:[kind,text,id]}];
 if(published){statements.push({sql:'UPDATE theme_editor_documents SET published_json=?,published_revision=published_revision+1 WHERE id=1 AND changes()=1',args:[text]},
 {sql:'UPDATE theme_editor_identity SET published_name=?,published_source=? WHERE id=1 AND changes()=1',args:[s.name,id]});}
 const results=await atomicBatch(db,statements);
 if(Number(results[0].rowsAffected??results[0].changes??0)!==1)throw fail('This draft changed in another window. Reload before saving.',409);
 return state(db,id);
}
async function list(db){const s=await state(db);return {published:{name:s.publishedName,source:s.publishedSource,revision:s.publishedRevision,updatedAt:s.updatedAt},drafts:[{id:'current',name:s.name,revision:s.revision,updated_at:s.updatedAt},...await db.all('SELECT id,name,draft_revision AS revision,updated_at FROM theme_editor_library ORDER BY updated_at DESC')]};}
async function duplicate(db,source,name){if(typeof name!=='string'||!name.trim()||name.length>120)throw fail('Use a theme name of 1–120 characters');const s=await state(db,source==='published'?'current':source),id='t_'+require('node:crypto').randomBytes(12).toString('hex');await db.run('INSERT INTO theme_editor_library(id,name,draft_json) VALUES(?,?,?)',[id,name.trim(),JSON.stringify(source==='published'?s.published:s.draft)]);return state(db,id);}
async function rename(db,id,name){themeId(id);if(typeof name!=='string'||!name.trim()||name.length>120)throw fail('Use a theme name of 1–120 characters');await state(db,id);if(id==='current')await db.run('UPDATE theme_editor_identity SET name=?,published_name=CASE WHEN published_source=? THEN ? ELSE published_name END WHERE id=1',[name.trim(),id,name.trim()]);else{await db.run('UPDATE theme_editor_library SET name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[name.trim(),id]);await db.run('UPDATE theme_editor_identity SET published_name=? WHERE published_source=?',[name.trim(),id]);}return state(db,id);}
module.exports={state,save,list,duplicate,rename,themeId};
