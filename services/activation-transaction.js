'use strict';
// Explicit maintenance transport only. Never imported by the running application.
function createActivationTransaction(url,token){
  if(!/^(https:\/\/|libsql:\/\/)/.test(url||'')||!token)throw new Error('Maintenance connection missing');
  let endpoint=new URL('/v2/pipeline',url.replace(/^libsql:/,'https:')).href,baton=null;
  const encode=value=>value===null?{type:'null'}:typeof value==='number'?(Number.isInteger(value)?{type:'integer',value:String(value)}:{type:'float',value}):{type:'text',value:String(value)};
  const decode=value=>{if(value.type==='null')return null;if(value.type==='integer'){const number=Number(value.value);if(!Number.isSafeInteger(number))throw new Error('Unsafe integer');return number;}if(value.type==='float')return value.value;if(value.type==='blob')return Buffer.from(value.base64,'base64');return value.value;};
  async function execute(sql,args=[]){
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({baton,requests:[{type:'execute',stmt:{sql,args:args.map(encode),want_rows:true}}]}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Maintenance transport rejected');
    const payload=await response.json();baton=payload.baton;if(payload.base_url)endpoint=new URL('/v2/pipeline',payload.base_url).href;
    const item=payload.results[0];if(item.type!=='ok')throw new Error('Maintenance statement rejected');
    const result=item.response.result;return result.rows.map(values=>Object.fromEntries(result.cols.map((column,index)=>[column.name,decode(values[index])])));
  }
  return {all:execute,get:async(...args)=>(await execute(...args))[0],run:execute,
    begin:()=>execute('BEGIN IMMEDIATE'),commit:()=>execute('COMMIT'),rollback:()=>execute('ROLLBACK'),
    async close(){if(!baton)return;await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({baton,requests:[{type:'close'}]}),signal:AbortSignal.timeout(5000)});}};
}
module.exports={createActivationTransaction};
