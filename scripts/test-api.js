'use strict';
// Read-only smoke check of the isolated demo. No environment loading and no POSTs.
const assert=require('node:assert/strict');
(async()=>{
  const base=new URL(process.argv[2]||'http://127.0.0.1:4310');
  if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw new Error('Only the local isolated demo is accepted');
  const helper=new URL(base);helper.port=String(Number(base.port)+1);helper.pathname='/';
  assert.match(await (await fetch(helper)).text(),/Local-SK-Demo!2026/);
  for(const route of ['/api/products','/api/collections'])assert.equal((await fetch(new URL(route,base))).status,200);
  assert.equal((await fetch(new URL('/api/orders',base))).status,401);
  console.log('Read-only isolated API smoke passed; no records were written.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});