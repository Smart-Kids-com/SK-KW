'use strict';
const isolation=require('./security-support');
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const db=require('../db/turso-manager');
const {migrateStore,repairOrderItemsRelation}=require('../db/store-migration');
let app,server,origin,cookie,mailMode='ok';const sent=[];
test('explicit inventory migration targets its supplied database and preserves legacy available stock only once',async()=>{
  const {createClient}=require('@libsql/client');
  const client=createClient({url:require('node:url').pathToFileURL(path.join(isolation.directory,'legacy-stock.db')).href});
  const target={all:async sql=>(await client.execute(sql)).rows,run:async sql=>client.execute(sql)};
  try{
    await client.execute('CREATE TABLE products(id INTEGER PRIMARY KEY,stock INTEGER,committed INTEGER,unavailable INTEGER)');
    await client.execute('INSERT INTO products VALUES(1,8,2,1)');
    const {migrateLegacyInventory}=require('../db/store-migration');
    await migrateLegacyInventory(target);
    assert.equal((await target.all('SELECT on_hand FROM products'))[0].on_hand,11);
    await target.run('UPDATE products SET on_hand=0');
    await migrateLegacyInventory(target);
    assert.equal((await target.all('SELECT on_hand FROM products'))[0].on_hand,0);
  }finally{client.close();}
});
const payload=extra=>({customerName:'Synthetic backend customer',customerEmail:'backend@example.invalid',customerPhone:'99999999',
  customerAddress:'Synthetic address',items:[{productId:1,quantity:2,price:0}],...extra});
async function request(route,{method='GET',body,admin=false}={}){
  const response=await fetch(origin+route,{method,redirect:'manual',headers:{...(admin?{Cookie:cookie}:{}),
    ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json()};
}
async function order(extra){const result=await request('/api/orders',{method:'POST',body:payload(extra)});assert.equal(result.status,201,JSON.stringify(result.data));return result.data.data;}
before(async()=>{
  await require('../scripts/security-demo-fixtures').seedSecurityDemo();
  const client=await db.ensureTursoClient();
  const rows=[];
  for(let id=10;id<260;id++)rows.push({sql:`INSERT INTO products(id,product_name,slug,price,status,on_hand,stock,inventory_enabled)
    VALUES(?,?,?,5,'active',100,100,1)`,args:[id,`Catalog product ${id}`,`catalog-${id}`]});
  for(let id=10;id<260;id++)rows.push({sql:`INSERT INTO orders(id,order_number,customer_name,customer_email,customer_phone,customer_address,subtotal,total)
    VALUES(?,?,'Synthetic','synthetic@example.invalid','99999999','Synthetic',5,7)`,args:[id,`BATCH-${id}`]});
  rows.push({sql:"INSERT INTO products(id,product_name,slug,price,status,stock,on_hand) VALUES(300,'Draft secret','draft-secret',5,'draft',100,100),(301,'Archive secret','archive-secret',5,'archived',100,100)"});
  rows.push({sql:"INSERT INTO collection_products(collection_id,product_id) VALUES(1,300)"});
  rows.push({sql:"INSERT INTO collections(id,title,slug,status,online_store) VALUES(2,'Draft collection','draft-collection','draft',1),(3,'Offline collection','offline-collection','active',0)"});
  await client.batch(rows,'write');
  // Real invoice rendering and SDK contract, fake provider only. Transports stay blocked.
  const Module=require('node:module'),load=Module._load;
  Module._load=function(name,...args){if(name==='resend')return {Resend:class{
    constructor(){this.emails={send:async(message,options)=>{sent.push({message,options});
      if(mailMode==='unknown')throw new Error('Synthetic lost response');
      return mailMode==='reject'?{error:{message:'Synthetic rejection'}}:{data:{id:'synthetic-mail-id'}};}};}
  }};return load.call(this,name,...args);};
  let email;try{email=require('../utils/email.js');}finally{Module._load=load;}
  process.env.RESEND_API_KEY='synthetic-not-a-real-key';process.env.MAIL_FROM='sender@example.invalid';
  isolation.setInvoiceTestSender(args=>email.sendInvoiceEmail(args));
  const wrapper=require('express')();
  wrapper.use((req,res,next)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'");next();});
  wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.fbq=function(){};'));
  server=wrapper.listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;
  process.env.PUBLIC_ORIGIN=origin;app=require('../server');wrapper.use(app);
  const jar=new Map();
  for(const [route,body] of [['/admin-login',{password:process.env.ADMIN_PASSWORD_1,next:'/orders-admin.html'}],
    ['/admin-otp',{otp:require('speakeasy').totp({secret:process.env.ADMIN_OTP_SECRET,encoding:'base32'}),next:'/orders-admin.html'}]]){
    const response=await fetch(origin+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',
      Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:new URLSearchParams(body)});
    for(const item of response.headers.getSetCookie()){const [key,value]=item.split(';')[0].split('=');value?jar.set(key,value):jar.delete(key);}
  }
  assert.ok(jar.has('sk_admin_session'));cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
});
beforeEach(async()=>{mailMode='ok';await db.run('UPDATE products SET on_hand=100,committed=0,unavailable=0,stock=100 WHERE id=1');});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));app?.locals.adminAuth.close();(await db.ensureTursoClient()).close();});

test('product and order pages use one page query, cursors, bounded offsets and batch image lookup',async()=>{
  await request('/api/products');
  for(const route of ['/api/products?limit=50&offset=150','/api/orders?limit=50&offset=150']){
    const reads=[];const originalGet=db.get,originalAll=db.all;
    db.get=async function(sql,...args){if(/FROM (products|orders)\b/.test(sql))reads.push(sql);return originalGet.call(this,sql,...args);};
    db.all=async function(sql,...args){if(/FROM (products|orders)\b/.test(sql))reads.push(sql);return originalAll.call(this,sql,...args);};
    try{const result=await request(route,{admin:true});assert.equal(result.status,200);assert.equal(result.data.data.length,50);assert.equal(reads.length,1);assert.match(reads[0],/LIMIT \? OFFSET \?/);}
    finally{db.get=originalGet;db.all=originalAll;}
  }
  assert.equal((await request('/api/products?offset=1000000')).status,400);
  assert.equal((await request('/api/orders?cursor=garbage',{admin:true})).status,400);
  const first=(await request('/api/products?limit=100')).data;
  const second=(await request(`/api/products?limit=100&cursor=${first.pagination.cursor.id}`)).data;
  assert.equal(second.data.length,100);assert.equal(first.pagination.hasMore,true);
  assert.ok(!first.data.some(row=>second.data.some(next=>next.id===row.id)));
  const plan=await db.all("EXPLAIN QUERY PLAN SELECT id FROM products WHERE status='active' AND id<200 ORDER BY id DESC LIMIT 100");
  assert.ok(plan.some(row=>String(row.detail).includes('idx_products_status_id')));
});
test('anonymous catalog cannot reveal draft/archived products or offline collections through any read path',async()=>{
  for(const route of ['/api/products/300','/api/products/slug/draft-secret','/api/products/301','/api/collections/2','/api/collections/slug/draft-collection','/api/collections/3/products'])assert.equal((await request(route)).status,404,route);
  for(const status of ['', 'draft','archived']){
    const result=await request('/api/products?status='+status);assert.ok(result.data.data.every(row=>row.status==='active'));
  }
  assert.equal((await request('/api/products/300',{admin:true})).status,200);
  const publicCollection=(await request('/api/collections/1?includeProducts=1')).data.data;
  assert.equal(publicCollection.product_count,1);assert.ok(publicCollection.products.every(row=>row.status==='active'));
  const products=(await request('/api/collections/1/products')).data;
  assert.equal(products.pagination.total,1);assert.equal(products.data.length,1);
  assert.ok((await request('/api/collections?status=draft')).data.data.every(row=>row.status==='active'&&row.online_store===1));
});
test('shared catalog loader fetches every page beyond 100 without duplicates',async()=>{
  const context={window:{},location:{href:origin+'/',origin},URL,AbortSignal,fetch:input=>fetch(origin+input),Error,Set};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/js/catalog-pages.js'),'utf8'),context);
  const result=await context.window.fetchCatalogPages('/api/products?limit=300');
  assert.equal(result.data.length,251);assert.ok(result.data.some(row=>row.id===10));
  assert.equal(new Set(result.data.map(row=>row.id)).size,result.data.length);
});
test('order transaction recovers its abandoned cart and delayed/concurrent saves never reopen it',async()=>{
  const token='synthetic_abandoned_token_123';
  const draft={checkoutToken:token,customerEmail:'backend@example.invalid',customerPhone:'99999999',cartItems:[{id:1,name:'Dummy',quantity:2,price:5}]};
  const saved=await Promise.all([request('/api/abandoned-checkouts/save',{method:'POST',body:draft}),request('/api/abandoned-checkouts/save',{method:'POST',body:draft})]);
  assert.ok(saved.every(row=>row.status===200));
  const created=await order({abandonedCheckoutToken:token,checkoutKey:'synthetic_recovery_order_123'});
  await request('/api/abandoned-checkouts/save',{method:'POST',body:draft});
  const cart=await db.get('SELECT * FROM abandoned_checkouts WHERE checkout_token=?',[token]);
  assert.equal(cart.status,'recovered');assert.equal(String(cart.recovered_order_id),String(created.id));assert.equal(cart.recovered_order_number,created.order_number);
  assert.equal((await request('/api/abandoned-checkouts/recover',{method:'POST',body:{checkoutToken:token,orderId:999}})).status,401);
  const late='synthetic_late_cart_token_123';const lateOrder=await order({abandonedCheckoutToken:late});
  await request('/api/abandoned-checkouts/save',{method:'POST',body:{...draft,checkoutToken:late}});
  assert.equal(String((await db.get('SELECT recovered_order_id FROM abandoned_checkouts WHERE checkout_token=?',[late])).recovered_order_id),String(lateOrder.id));
});
test('invalid order and foreign cart identity cannot mark abandoned checkout recovered',async()=>{
  const token='synthetic_invalid_cart_123';
  await request('/api/abandoned-checkouts/save',{method:'POST',body:{checkoutToken:token,customerEmail:'owner@example.invalid',customerPhone:'98888888',cartItems:[{id:1,name:'Dummy',quantity:2}]}});
  assert.equal((await request('/api/orders',{method:'POST',body:payload({abandonedCheckoutToken:token})})).status,400);
  assert.equal((await db.get('SELECT status FROM abandoned_checkouts WHERE checkout_token=?',[token])).status,'open');
});
test('different billing address persists separately and missing fields fail before creating an order',async()=>{
  const billing={firstName:'<script>billing</script>',lastName:'Dummy',address1:'Different address',city:'City',governorate:'حولي',phone:'99999999'};
  const created=await order({billingMode:'different',billingAddress:billing});
  const row=await db.get('SELECT * FROM orders WHERE id=?',[created.id]);assert.equal(row.customer_address,'Synthetic address');assert.equal(JSON.parse(row.billing_address).address1,'Different address');
  assert.equal((await request('/api/orders',{method:'POST',body:payload({billingMode:'different',billingAddress:{firstName:'Incomplete'}})})).status,400);
});
test('invoice uses the existing sender, safe billing text and durable provider id; retries do not resend',async()=>{
  const created=await order({billingMode:'different',billingAddress:{firstName:'<script>x</script>',lastName:'Dummy',address1:'Invoice street',city:'City',governorate:'حولي',phone:'99999999'}});
  const before=sent.length;
  const results=await Promise.all([request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true}),request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})]);
  assert.ok(results.some(row=>row.status===200));assert.ok(results.every(row=>[200,409].includes(row.status)));
  assert.equal(sent.length,before+1);assert.match(sent.at(-1).message.html,/Invoice street/);assert.match(sent.at(-1).message.html,/&lt;script&gt;x/);assert.doesNotMatch(sent.at(-1).message.html,/<script>x/);
  assert.match(sent.at(-1).options.idempotencyKey,new RegExp(`^order-invoice-${created.id}-[a-f0-9]{64}$`));
  assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,200);assert.equal(sent.length,before+1);
  assert.equal((await db.get('SELECT state FROM order_invoice_versions WHERE order_id=?',[created.id])).state,'sent');
  assert.ok((await db.get('SELECT invoice_sent_at FROM orders WHERE id=?',[created.id])).invoice_sent_at);
});
test('expired invoice send requires review without contacting the provider',async()=>{
  const created=await order();
  const saved=(await request(`/api/orders/${created.id}`,{admin:true})).data.data;
  await db.run("INSERT INTO order_invoice_versions(order_id,version,state,lease_token,lease_until,retry_until) VALUES(?,?,'sending','abandoned',?,?)",[created.id,require('../services/order-invoice').invoiceVersion(saved),Date.now()-24*60*60*1000,Date.now()-1000]);
  const count=sent.length;
  for(let attempt=0;attempt<2;attempt++){
    const result=await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true});
    assert.equal(result.status,409);
    assert.match(result.data.error,/غير مؤكدة/);
  }
  assert.equal(sent.length,count);
  assert.equal((await db.get('SELECT state FROM order_invoice_versions WHERE order_id=?',[created.id])).state,'uncertain');
  assert.equal((await db.get('SELECT invoice_sent_at FROM orders WHERE id=?',[created.id])).invoice_sent_at,null);
});
test('rejected or uncertain invoice delivery is never recorded as sent',async()=>{
  for(const mode of ['reject','unknown']){
    mailMode=mode;const created=await order();
    assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,502);
    assert.equal((await db.get('SELECT invoice_sent_at FROM orders WHERE id=?',[created.id])).invoice_sent_at,null);
    if(mode==='unknown')assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,409);
  }
});
test('invoice sends saved edited order as a new version and concurrent retries send each version once',async()=>{
  const created=await order();const count=sent.length;
  const send=()=>request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true});
  assert.equal((await send()).status,200);
  const firstKey=sent.at(-1).options.idempotencyKey;
  assert.equal((await request(`/api/orders/${created.id}/customer`,{method:'PUT',admin:true,
    body:{customerName:'Updated invoice customer',customerEmail:'updated@example.invalid'}})).status,200);
  const results=await Promise.all([send(),send(),send()]);
  assert.ok(results.some(result=>result.status===200));
  assert.ok(results.every(result=>[200,409].includes(result.status)));
  assert.equal(sent.length,count+2);
  assert.notEqual(sent.at(-1).options.idempotencyKey,firstKey);
  assert.equal(sent.at(-1).message.to,'updated@example.invalid');
  assert.match(sent.at(-1).message.html,/Updated invoice customer/);
  assert.equal((await send()).status,200);assert.equal(sent.length,count+2);
  assert.equal((await db.get("SELECT COUNT(*) n FROM order_invoice_versions WHERE order_id=? AND state='sent'",[created.id])).n,2);
  // Returning to previously sent content must replay that version, not resend.
  await request(`/api/orders/${created.id}/customer`,{method:'PUT',admin:true,
    body:{customerName:'Synthetic backend customer',customerEmail:'backend@example.invalid'}});
  assert.equal((await send()).status,200);assert.equal(sent.length,count+2);
});
test('invoice legacy review keeps old records and either blocks duplicates or allows updated content',async()=>{
  for(const decision of ['already_sent','new_version']){
    const created=await order();const count=sent.length;
    await db.run("INSERT INTO order_invoice_jobs(order_id,state,provider_id) VALUES(?,'sent','legacy-provider')",[created.id]);
    const status=(await request(`/api/orders/${created.id}/invoice-status`,{admin:true})).data.data;
    assert.equal(status.state,'legacy_review');
    assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,409);
    assert.equal((await request(`/api/orders/${created.id}/invoice-review`,{method:'POST',admin:true,body:{decision,version:'stale'}})).status,409);
    assert.equal((await request(`/api/orders/${created.id}/invoice-review`,{method:'POST',admin:true,body:{decision,version:status.version}})).status,200);
    assert.equal(sent.length,count);
    for(let i=0;i<2;i++)assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,200);
    assert.equal(sent.length,count+(decision==='new_version'?1:0));
    assert.equal((await db.get('SELECT provider_id FROM order_invoice_jobs WHERE order_id=?',[created.id])).provider_id,'legacy-provider');
    await request(`/api/orders/${created.id}/customer`,{method:'PUT',admin:true,body:{customerName:'Modified after legacy review'}});
    assert.equal((await request(`/api/orders/${created.id}/send-invoice`,{method:'POST',admin:true})).status,200);
    assert.equal(sent.length,count+(decision==='new_version'?2:1));
  }
});
test('invoice browser button sends saved quantities totals address and contact once per version',async()=>{
  const created=await order({billingMode:'different',billingAddress:{firstName:'Invoice',lastName:'Customer',address1:'Separate billing street',city:'City',governorate:'حولي',phone:'99999999'}});
  await require('../scripts/check-order-browser').checkOrderBrowser(origin,db,{invoice:true,orderId:created.id,cookie,sent});
});
test('unsupported admin actions cannot break order edits and server rejects bypasses without mutation',async()=>{
  const created=await order();
  const before={...await db.get('SELECT status,total,notes FROM orders WHERE id=?',[created.id])};
  for(const [route,body,method] of [
    [`/api/orders/${created.id}`,{status:'on_hold',shippingCost:9,notes:'must not save'},'PUT'],
    ['/api/orders/bulk/status',{ids:[created.id],status:'on_hold'},'POST']]){
    assert.equal((await request(route,{method,admin:true,body})).status,400);
    assert.deepEqual({...await db.get('SELECT status,total,notes FROM orders WHERE id=?',[created.id])},before);
  }
  await require('../db/orders-admin-migration').migrateOrdersAdmin(db);
  await require('../scripts/check-order-browser').checkOrderBrowser(origin,db,{unsupportedActions:true,orderId:created.id,cookie});
  assert.deepEqual({...await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')},{on_hand:100,committed:2,stock:98});
});
test('marking payment does not fulfill or consume reserved stock; fulfillment acts once',async()=>{
  const created=await order();
  assert.equal((await request(`/api/orders/${created.id}/mark-paid`,{method:'POST',admin:true})).status,200);
  const row=await db.get('SELECT status,payment_status FROM orders WHERE id=?',[created.id]);assert.equal(row.status,'pending');assert.equal(row.payment_status,'paid');
  assert.deepEqual({...await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')},{on_hand:100,committed:2,stock:98});
  await request(`/api/orders/${created.id}/fulfill`,{method:'POST',admin:true});
  await request(`/api/orders/${created.id}/fulfill`,{method:'POST',admin:true});
  assert.deepEqual({...await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')},{on_hand:98,committed:0,stock:98});
});
test('schema migration repeats safely; manager paths agree and writes never retry after ambiguous timeout',async()=>{
  const before=await db.get('SELECT COUNT(*) AS n FROM orders');await migrateStore(db);await migrateStore(db);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM orders')).n,before.n);
  assert.equal(require('../db/init'),db);assert.equal(require('../db/paths').LOCAL_DATABASE_PATH,path.join(__dirname,'../orders.db'));
  const client=await db.ensureTursoClient(),execute=client.execute;let calls=0;
  client.execute=async()=>{calls++;throw new Error('synthetic ambiguous timeout');};
  try{await assert.rejects(db.run('INSERT INTO synthetic_unknown VALUES (1)'),/timeout/);assert.equal(calls,1);}finally{client.execute=execute;}
  const run=db.run;db.run=async()=>{throw new Error('synthetic initialization failure');};
  try{await assert.rejects(db.initializeTables(),/initialization failure/);}finally{db.run=run;}
});
test('orders_old foreign key is repaired without losing items and rejects orphan writes',async()=>{
  await db.run('CREATE TABLE orders_old(id INTEGER PRIMARY KEY)');await db.run('INSERT INTO orders_old SELECT id FROM orders');
  await db.run('CREATE TABLE order_items_legacy(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL,product_id TEXT NOT NULL,product_name TEXT NOT NULL,product_price REAL NOT NULL,quantity INTEGER NOT NULL,subtotal REAL NOT NULL,FOREIGN KEY(order_id) REFERENCES orders_old(id))');
  await db.run("INSERT INTO order_items_legacy VALUES(1,1,'1','Legacy item',5,1,5)");
  await db.run('ALTER TABLE order_items RENAME TO original_items');await db.run('ALTER TABLE order_items_legacy RENAME TO order_items');
  try{
    assert.equal(await repairOrderItemsRelation(db),true);
    assert.ok((await db.all('PRAGMA foreign_key_list(order_items)')).some(row=>row.table==='orders'));
    assert.equal((await db.get('SELECT product_price FROM order_items WHERE id=1')).product_price,5);
    await assert.rejects(db.run("INSERT INTO order_items VALUES(2,999999,'1','Orphan',5,1,5)"));
  }finally{
    await db.run('DROP TABLE order_items');await db.run('ALTER TABLE original_items RENAME TO order_items');await db.run('DROP TABLE orders_old');
    await require('../db/order-inventory-migration').migrateOrderInventory(db);
  }
});
test('checkout accessibility and selected-order actions are wired without replacing the shared menu',()=>{
  const checkout=fs.readFileSync(path.join(__dirname,'../public/checkout.html'),'utf8');
  assert.match(checkout,/role="button" tabindex="0" aria-controls="summaryPanel" aria-expanded="true"/);assert.match(checkout,/shipping given-name/);assert.match(checkout,/toggle.addEventListener\('keydown'/);
  const orders=fs.readFileSync(path.join(__dirname,'../public/orders-admin.html'),'utf8');
  assert.doesNotMatch(orders,/fakeAction|is not connected yet/);assert.match(orders,/id="run-action"/);assert.match(orders,/data-action="request_note"/);assert.match(orders,/src="\/js\/orders-admin.js"/);
  assert.match(orders,/admin-navigation.js/);
});
test('expanded browser checkout covers full catalog, different billing address, keyboard summary and recovery',
  {skip:process.env.SK_ORDER_BROWSER!=='1'},async()=>{await require('../scripts/check-order-browser').checkOrderBrowser(origin,db,{catalog:true});});
test('all database effects stayed in temporary files and no real provider or external transport was used',()=>{
  assert.ok(!isolation.blockedEffects.includes('database'));assert.ok(!isolation.blockedEffects.includes('network'));
  assert.ok(isolation.blockedEffects.includes('email'));assert.ok(isolation.blockedEffects.includes('meta'));
});
