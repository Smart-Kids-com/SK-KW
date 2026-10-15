'use strict';
// Manual, guarded activation only. Does not load dotenv into process.env or start the app.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function applyApprovedOpening(db,approval){
  await db.begin();let commitAttempted=false;
  try{
    await require('../db/activation-migration').migrateActivation(db);
    const result=await require('../services/opening-inventory-settlement').settleOpeningInventory(db,approval);
    const invalid=await db.all('PRAGMA foreign_key_check');if(invalid.length)throw new Error('Foreign-key verification failed');
    const inconsistent=await db.get('SELECT COUNT(*) AS n FROM products WHERE stock!=MAX(0,on_hand-committed-unavailable)');
    if(Number(inconsistent.n))throw new Error('Inventory verification failed');
    commitAttempted=true;await db.commit();return result;
  }catch(error){try{await db.rollback();}catch{}if(commitAttempted)throw new Error('Commit result uncertain; inspect settlement marker with read-only connection before retry');throw error;}
  finally{try{await db.close();}catch{}}
}
module.exports={applyApprovedOpening};
if(require.main===module){
  (async()=>{
    if(!process.argv.includes('--apply')||!process.argv.includes('--maintenance-confirmed'))throw new Error('Explicit apply and maintenance acknowledgement required');
    const index=process.argv.indexOf('--backup-manifest');if(index<0||!process.argv[index+1])throw new Error('Fresh verified backup manifest required');
    const manifestPath=path.resolve(process.argv[index+1]);const manifest=JSON.parse(fs.readFileSync(manifestPath));
    if(!manifest.restoreVerified||!manifest.rollbackVerified||Date.now()-Date.parse(manifest.completedAt)>3600000)throw new Error('Backup must be verified and less than one hour old');
    if(path.resolve(manifest.backupDirectory)!==path.dirname(manifestPath))throw new Error('Backup manifest location mismatch');
    const snapshot=path.join(manifest.backupDirectory,'production-snapshot.db');
    if(crypto.createHash('sha256').update(fs.readFileSync(snapshot)).digest('hex')!==manifest.sha256)throw new Error('Backup hash mismatch');
    const parse=require('dotenv').parse;
    const config=parse(fs.readFileSync(path.join(__dirname,'../.env.activation-write.local')));
    const readonly=parse(fs.readFileSync(path.join(__dirname,'../.env.activation-readonly.local')));
    if(config.DATABASE_URL!==readonly.DATABASE_URL||config.DATABASE_AUTH_TOKEN===readonly.DATABASE_AUTH_TOKEN)throw new Error('Dedicated write credential for the reviewed target required');
    if(manifest.targetHash!==crypto.createHash('sha256').update(config.DATABASE_URL).digest('hex'))throw new Error('Fresh backup must match reviewed production target');
    const db=require('../services/activation-transaction').createActivationTransaction(config.DATABASE_URL,config.DATABASE_AUTH_TOKEN);
    const approval=JSON.parse(fs.readFileSync(path.join(__dirname,'../db/opening-inventory-approval.json')));
    console.log(JSON.stringify(await applyApprovedOpening(db,approval)));
  })().catch(()=>{console.error('Activation stopped or failed. No secrets/details printed; use read-only verification before any retry.');process.exitCode=1;});
}
