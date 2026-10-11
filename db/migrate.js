'use strict';
const {migrateStore}=require('./store-migration');
module.exports={migrateStore};
if(require.main===module){
  if(!process.env.LOCAL_DATABASE_PATH || process.env.DATABASE_URL){
    console.error('Explicit LOCAL_DATABASE_PATH is required; this launcher refuses remote databases.');process.exitCode=1;
  }else{
    const db=require('./turso-manager');
    (async()=>{try{await db.open();await migrateStore(db);console.log('Explicit local migration completed');}
      finally{await db.close();}})().catch(()=>{console.error('Migration failed; review the schema and reconciliation plan');process.exitCode=1;});
  }
}