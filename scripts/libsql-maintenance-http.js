'use strict';
// Bounded HTTP transactions for maintenance tools; never logs endpoints, SQL values or credentials.
function createMaintenanceClient({url,authToken}){
 const initial=new URL('/v2/pipeline',url.replace(/^libsql:/,'https:')).href;
 const encode=v=>v==null?{type:'null'}:typeof v==='bigint'?{type:'integer',value:v.toString()}:typeof v==='number'?Number.isInteger(v)?{type:'integer',value:String(v)}:{type:'float',value:v}:{type:'text',value:String(v)};
 const decode=v=>v.type==='null'?null:v.type==='integer'?Number(v.value):v.type==='float'?v.value:v.type==='blob'?Buffer.from(v.base64,'base64'):v.value;
 function session(){let baton=null,endpoint=initial;return {async execute(statement){const {sql,args=[]}=typeof statement==='string'?{sql:statement}:statement;const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+authToken,'Content-Type':'application/json'},body:JSON.stringify({baton,requests:[{type:'execute',stmt:{sql,args:args.map(encode),want_rows:true}}]}),signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('Maintenance HTTP status '+response.status);const payload=await response.json();baton=payload.baton;if(payload.base_url)endpoint=new URL('/v2/pipeline',payload.base_url).href;const r=payload.results[0];if(r.type!=='ok')throw Error('Maintenance query failed: '+(r.error?.code||'UNKNOWN'));const data=r.response.result;return {rows:data.rows.map(values=>Object.fromEntries(data.cols.map((c,i)=>[c.name,decode(values[i])]))),rowsAffected:data.affected_row_count};},close(){}};}
 return {async transaction(mode){const s=session();await s.execute(mode==='read'?'BEGIN TRANSACTION READONLY':'BEGIN IMMEDIATE');return {...s,commit:()=>s.execute('COMMIT'),rollback:()=>s.execute('ROLLBACK')};},close(){}};
}
module.exports={createMaintenanceClient};
