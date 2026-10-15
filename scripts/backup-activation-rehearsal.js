'use strict';
// Snapshot from one remote READ transaction. Every mutation targets dedicated local files only.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
let stage='start';
const q=name=>'"'+name.replaceAll('"','""')+'"';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const encode=value=>typeof value==='bigint'?{integer:value.toString()}:value instanceof ArrayBuffer||ArrayBuffer.isView(value)?{blob:Buffer.from(value instanceof ArrayBuffer?value:value.buffer,value.byteOffset||0,value.byteLength).toString('base64')}:value;
const digestRows=rows=>crypto.createHash('sha256').update(JSON.stringify(rows.map(row=>Object.keys(row).map(key=>[key,encode(row[key])])).map(row=>JSON.stringify(row)).sort())).digest('hex');
function all(db,sql){const stmt=db.prepare(sql);stmt.setReadBigInts(true);return stmt.all();}
function fingerprint(db,snapshot){return Object.fromEntries(snapshot.tables.map(t=>[t.name,digestRows(all(db,`SELECT ${t.columns.map(q).join(',')} FROM ${q(t.name)}`))]));}
async function main(){
  const config=require('dotenv').parse(fs.readFileSync(path.resolve('.env.activation-readonly.local')));
  assert.match(config.DATABASE_URL||'',/^(libsql:\/\/|https:\/\/)/);assert.ok(config.DATABASE_AUTH_TOKEN);
  const directory=fs.realpathSync(process.argv[2]);
  const allowedRoots=[fs.realpathSync(os.tmpdir())];
  const permanentRoot=path.resolve(__dirname,'../../SK-KW-backups');
  if(fs.existsSync(permanentRoot))allowedRoots.push(fs.realpathSync(permanentRoot));
  assert.ok(allowedRoots.includes(path.dirname(directory)));assert.match(path.basename(directory),/^SK-KW-production-backup-/);
  const backup=path.join(directory,'production-snapshot.db');assert.ok(!fs.existsSync(backup));
  let endpoint=new URL('/v2/pipeline',config.DATABASE_URL.replace(/^libsql:/,'https:')).href,baton=null;
  const decode=value=>value.type==='null'?null:value.type==='integer'?BigInt(value.value):value.type==='float'?value.value:value.type==='blob'?Buffer.from(value.base64,'base64'):value.value;
  const client={async execute(sql){
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+config.DATABASE_AUTH_TOKEN,'Content-Type':'application/json'},
      body:JSON.stringify({baton,requests:[{type:'execute',stmt:{sql,args:[],want_rows:true}}]}),signal:AbortSignal.timeout(20000)});
    if(!response.ok){const error=new Error('HTTP failure');error.code='HTTP_'+response.status;throw error;}
    const payload=await response.json();baton=payload.baton;if(payload.base_url)endpoint=new URL('/v2/pipeline',payload.base_url).href;
    const result=payload.results[0];if(result.type!=='ok'){const error=new Error('Remote query rejected');error.code=result.error?.code||'REMOTE_QUERY_ERROR';throw error;}
    const data=result.response.result;return {rows:data.rows.map(values=>Object.fromEntries(data.cols.map((column,index)=>[column.name,decode(values[index])])))};
  },async transaction(){await this.execute('BEGIN TRANSACTION READONLY');return {execute:sql=>this.execute(sql),rollback:()=>this.execute('ROLLBACK'),close(){}};},close(){}};
  const snapshot={tables:[],objects:[],startedAt:new Date().toISOString()};let transaction;
  try{
    console.log('Opening remote read-only snapshot transaction.');
    transaction=await client.transaction('read');
    const objects=Array.from((await transaction.execute("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name")).rows);
    for(const object of objects.filter(row=>row.type==='table'&&!row.name.startsWith('sqlite_'))){
      const columns=Array.from((await transaction.execute(`PRAGMA table_xinfo(${q(object.name)})`)).rows).filter(row=>Number(row.hidden)===0).map(row=>row.name);
      const rows=Array.from((await transaction.execute(`SELECT ${columns.map(q).join(',')} FROM ${q(object.name)}`)).rows);
      snapshot.tables.push({...object,columns,rows});
    }
    snapshot.objects=objects.filter(row=>row.type!=='table'&&!row.name.startsWith('sqlite_'));
    snapshot.sequence=objects.some(row=>row.name==='sqlite_sequence')?Array.from((await transaction.execute('SELECT name,seq FROM sqlite_sequence')).rows):[];
    snapshot.userVersion=Number((await transaction.execute('PRAGMA user_version')).rows[0].user_version);
    snapshot.applicationId=Number((await transaction.execute('PRAGMA application_id')).rows[0].application_id);
    await transaction.rollback();snapshot.completedAt=new Date().toISOString();
    console.log('Read-only snapshot captured; all remaining operations are local.');
  }finally{transaction?.close();client.close();}
  // Remote credentials are never passed to local migration code.
  const local=new DatabaseSync(backup);local.exec('PRAGMA foreign_keys=OFF; BEGIN');
  try{
    for(const table of snapshot.tables){stage='create-table:'+table.name;local.exec(table.sql);}
    for(const table of snapshot.tables){
      stage='copy-table:'+table.name;
      const insert=local.prepare(`INSERT INTO ${q(table.name)}(${table.columns.map(q).join(',')}) VALUES(${table.columns.map(()=>'?').join(',')})`);
      for(const row of table.rows)insert.run(...table.columns.map(name=>row[name] instanceof ArrayBuffer?Buffer.from(row[name]):row[name]));
    }
    if(snapshot.sequence.length){local.exec('DELETE FROM sqlite_sequence');const stmt=local.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)');for(const row of snapshot.sequence)stmt.run(row.name,row.seq);}
    for(const object of snapshot.objects){stage='create-object:'+object.name;local.exec(object.sql);}
    local.exec(`PRAGMA user_version=${snapshot.userVersion}; PRAGMA application_id=${snapshot.applicationId}; COMMIT`);
  }catch(error){local.exec('ROLLBACK');throw error;}
  assert.equal(local.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(local.prepare('PRAGMA foreign_key_check').all(),[]);
  const original=Object.fromEntries(snapshot.tables.map(t=>[t.name,digestRows(t.rows)]));
  assert.deepEqual(fingerprint(local,snapshot),original);local.close();
  const manifest={startedAt:snapshot.startedAt,completedAt:snapshot.completedAt,targetHash:crypto.createHash('sha256').update(config.DATABASE_URL).digest('hex'),sha256:hash(backup),
    logicalTableHashes:original,counts:Object.fromEntries(snapshot.tables.map(t=>[t.name,t.rows.length])),snapshotConsistent:true,restoreVerified:false};
  const restoredFile=path.join(directory,'restored-before-migration.db');fs.copyFileSync(backup,restoredFile);
  let restored=new DatabaseSync(restoredFile);assert.deepEqual(fingerprint(restored,snapshot),original);restored.close();manifest.restoreVerified=true;
  const workFile=path.join(directory,'migration-rehearsal.db');fs.copyFileSync(backup,workFile);
  const work=new DatabaseSync(workFile);work.exec('PRAGMA foreign_keys=ON');
  const statements=[];let operations=0,failAt=Infinity;
  const adapter={all:async sql=>work.prepare(sql).all(),run:async sql=>{if(++operations===failAt)throw new Error('Synthetic migration failure');statements.push(sql);return work.prepare(sql).run();}};
  const {migrateActivation}=require('../db/activation-migration');
  // Failed mid-migration must roll back all DDL and preserve original data.
  work.exec('BEGIN IMMEDIATE');failAt=5;
  await assert.rejects(async()=>{try{await migrateActivation(adapter);}finally{work.exec('ROLLBACK');}});
  assert.deepEqual(fingerprint(work,snapshot),original);
  assert.equal(work.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('orders') WHERE name='billing_mode'").get().n,0);
  failAt=Infinity;operations=0;statements.length=0;work.exec('BEGIN IMMEDIATE');
  try{await migrateActivation(adapter);work.exec('COMMIT');}catch(error){work.exec('ROLLBACK');throw error;}
  const sql='-- Schema-only delta rehearsed against the read-only production snapshot.\n-- Apply only after explicit maintenance authorization and inventory reconciliation.\nBEGIN IMMEDIATE;\n'+statements.map(s=>s+';').join('\n')+'\nCOMMIT;\n';
  fs.writeFileSync(path.join(__dirname,'../db/activation-schema-delta.sql'),sql);
  assert.deepEqual(fingerprint(work,snapshot),original);
  assert.deepEqual(work.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(work.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  const schemaBeforeRepeat=JSON.stringify(work.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY type,name').all());
  work.exec('BEGIN IMMEDIATE');await migrateActivation(adapter);work.exec('COMMIT');
  assert.equal(JSON.stringify(work.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY type,name').all()),schemaBeforeRepeat);
  assert.deepEqual(fingerprint(work,snapshot),original);
  const differences=work.prepare(`SELECT product_name,sku,stock,on_hand,stock-on_hand AS difference FROM products
    WHERE COALESCE(stock,0)!=MAX(0,COALESCE(on_hand,0)-COALESCE(committed,0)-COALESCE(unavailable,0)) ORDER BY id`).all();
  const pending=work.prepare(`SELECT p.product_name,p.sku,SUM(i.quantity) AS pending_quantity,COUNT(DISTINCT o.id) AS pending_orders,
    p.stock,p.on_hand,p.on_hand-SUM(i.quantity) AS hypothetical_available_if_unaccounted
    FROM orders o JOIN order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id
    WHERE o.status='pending' GROUP BY p.id ORDER BY p.id`).all();
  work.close();
  const rollbackFile=path.join(directory,'rollback-restored.db');fs.copyFileSync(backup,rollbackFile);
  restored=new DatabaseSync(rollbackFile);assert.deepEqual(fingerprint(restored,snapshot),original);
  assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(),[]);restored.close();
  assert.equal(hash(rollbackFile),manifest.sha256);assert.equal(hash(backup),manifest.sha256);
  Object.assign(manifest,{failedMigrationRolledBack:true,migrationDataPreserved:true,migrationRepeatSafe:true,rollbackVerified:true,
    differences,pending,backupDirectory:directory});
  fs.writeFileSync(path.join(directory,'verification-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'../docs/activation-rehearsal-results.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({backupDirectory:directory,restoreVerified:true,migrationDataPreserved:true,migrationRepeatSafe:true,failedMigrationRolledBack:true,rollbackVerified:true,differences,pending},null,2));
}
const keepAlive=setInterval(()=>{},1000);
main().catch(error=>{console.error('Backup/rehearsal failed at '+stage+'; code '+(error.code||error.name||'unknown')+'; safe SQLite detail: '+(String(error.message).match(/(?:no such table: [\w]+|near "[\w]+": syntax error|table [\w]+ already exists|cannot store [\w ]+ in [\w.]+|NOT NULL constraint failed: [\w.]+)/)?.[0]||'suppressed')+'. No remote writes issued.');process.exitCode=1;}).finally(()=>clearInterval(keepAlive));
