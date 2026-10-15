'use strict';
// Explicit initialization of the named authentication database only. No app imports.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const parse=require('dotenv').parse;
const auth=parse(fs.readFileSync(path.join(root,'.env.activation-auth.local')));
const normalize=value=>new URL(value.replace(/^libsql:/,'https:'));
async function main(){
  const target=normalize(auth.AUTH_DATABASE_URL||'');
  assert.equal(target.protocol,'https:');
  assert.match(target.hostname,/^smart-kids-auth(?:-|\.)/);
  assert.ok(auth.AUTH_DATABASE_AUTH_TOKEN);
  for(const name of ['.env.activation-readonly.local','.env.activation-write.local']){
    const file=path.join(root,name);if(!fs.existsSync(file))continue;
    const store=parse(fs.readFileSync(file));
    if(store.DATABASE_URL)assert.notEqual(target.hostname,normalize(store.DATABASE_URL).hostname);
  }
  const db=require('../services/activation-transaction').createActivationTransaction(auth.AUTH_DATABASE_URL,auth.AUTH_DATABASE_AUTH_TOKEN);
  const expected={admin_sessions:['token_hash','scope','credential_version','expires_at'],admin_login_limits:['bucket_key','attempts','resets_at'],admin_totp_replay:['credential_version','last_step']};
  let committed=false;
  try{
    assert.equal((await db.get('SELECT 1 AS connected')).connected,1);
    await db.begin();
    const existing=await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if(existing.some(row=>!Object.hasOwn(expected,row.name)))throw new Error('Unexpected tables in dedicated authentication target');
    const sql=fs.readFileSync(path.join(root,'db/auth-schema.sql'),'utf8');
    for(const statement of sql.split(';').filter(value=>value.trim()))await db.run(statement);
    for(const [table,columns] of Object.entries(expected)){
      const actual=await db.all('PRAGMA table_info('+table+')');
      assert.ok(columns.every(name=>actual.some(row=>row.name===name)));
      assert.ok(actual.some(row=>row.name===columns[0]&&row.pk===1));
    }
    assert.ok(await db.get("SELECT name FROM sqlite_master WHERE type='index' AND name='admin_sessions_expiry'"));
    await db.commit();committed=true;
    const tables=await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('admin_sessions','admin_login_limits','admin_totp_replay') ORDER BY name");
    assert.equal(tables.length,3);
    console.log(JSON.stringify({database:'smart-kids-auth',connectionVerified:true,tables:tables.map(row=>row.name),index:'admin_sessions_expiry',storeDatabaseUntouched:true,vercelUntouched:true}));
  }catch(error){if(!committed)try{await db.rollback();}catch{}throw error;}
  finally{try{await db.close();}catch{}}
}
main().catch(()=>{console.error('Dedicated authentication setup failed or result uncertain. Details and credentials suppressed; inspect this authentication database before retry.');process.exitCode=1;});
