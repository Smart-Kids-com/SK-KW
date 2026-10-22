'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),{once}=require('node:events');
const {createClient}=require('@libsql/client'),{libsqlFetch}=require('../db/libsql-fetch');
test('libSQL native fetch bridge reads multi-chunk responses above stream high-water mark',async()=>{
 const huge='نص عربي '.repeat(14000);let requests=0;
 const server=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const payload=JSON.parse(Buffer.concat(chunks));requests++;
 const results=payload.requests.map(r=>({type:'ok',response:r.type==='execute'?{type:'execute',result:{cols:[{name:'content',decltype:'TEXT'}],rows:[[{type:'text',value:huge}]],affected_row_count:0,last_insert_rowid:null}}:{type:r.type}}));const body=Buffer.from(JSON.stringify({baton:null,base_url:null,results}));res.writeHead(200,{'Content-Type':'application/json'});for(let i=0;i<body.length;i+=4096){res.write(body.subarray(i,i+4096));await new Promise(r=>setImmediate(r))}res.end();
 });server.listen(0,'127.0.0.1');await once(server,'listening');const client=createClient({url:'http://127.0.0.1:'+server.address().port,fetch:libsqlFetch});
 try{for(let n=0;n<3;n++){const result=await client.execute('SELECT content FROM example');assert.equal(result.rows[0].content,huge)}assert(requests>=3);const previousURL=process.env.DATABASE_URL;process.env.DATABASE_URL='http://127.0.0.1:'+server.address().port;try{const db=require('../db/turso-manager');const row=await db.get('SELECT content FROM example');row.content='mutable';assert.equal(row.content,'mutable');const rows=await db.all('SELECT content FROM example');rows[0].content='also mutable';assert.equal(rows[0].content,'also mutable');(await db.ensureTursoClient()).close()}finally{if(previousURL===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousURL}}finally{client.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
});
test('bridge preserves request method, headers, binary body and abort without exposing credentials',async()=>{
 const previous=global.fetch,controller=new AbortController();let captured;
 global.fetch=async(url,init)=>{captured={url,init};return {ok:true}};
 try{const {Request}=require('@libsql/isomorphic-fetch');await libsqlFetch(new Request('https://database.example.invalid/v2/pipeline',{method:'POST',headers:{Authorization:'Bearer synthetic-test'},body:Buffer.from([0,255,3]),signal:controller.signal}));assert.equal(captured.init.method,'POST');assert.equal(new Headers(captured.init.headers).get('Authorization'),'Bearer synthetic-test');assert.deepEqual(captured.init.body,Buffer.from([0,255,3]));controller.abort();assert(captured.init.signal.aborted)}finally{global.fetch=previous}
});

test('Orders list accepts immutable remote SDK rows without changing them',async()=>{const row=Object.freeze({id:1,notes:'plain note'}),db={all:async sql=>sql.includes('FROM orders o')?[row]:[{order_id:1,pieces:2,types:1}]};const result=await require('../services/orders-admin').rows(db,{where:'',order:'',args:[]},25,0);assert.equal(result[0].pieces,2);assert.deepEqual(result[0].tags,[]);assert.equal(row.notes,'plain note');assert(!Object.hasOwn(row,'tags'));});
