'use strict';
const Module=require('node:module'),nativeLoad=Module._load;
const isolation=require('./security-support'),isolatedLoad=Module._load;
const {test}=require('node:test'),assert=require('node:assert/strict');
const mailRequests=[],uniqueMail=new Map();let effects=0,capi=0,email;
Module._load=function(name,parent,isMain){
 if(name==='resend')return {Resend:class {
   constructor(){this.emails={send:async(message,options)=>{
     mailRequests.push({message,options});
     if(!uniqueMail.has(options?.idempotencyKey))uniqueMail.set(options?.idempotencyKey,message);
     return {data:{id:'mock-'+options.idempotencyKey}};
   }};}
 }};
 if(name.endsWith('/utils/email'))return {sendOrderEmails:async args=>{effects++;return email.sendOrderEmails(args);},sendInvoiceEmail:async()=>{throw Error('Automatic invoice must not be sent');}};
 if(name.endsWith('/services/meta-capi'))return {sendMetaPurchase:async()=>{capi++;return {success:true};}};
 return isolatedLoad.call(this,name,parent,isMain);
};
email=nativeLoad.call(module,'../utils/email',module);
const P=require('../public/js/order-presentation');
const hostile='<img src=x onerror="window.pwned=1"><svg onload="window.pwned=1"> منتج عربي طويل جدًا للاختبار والقراءة على الهاتف';
const order={id:900,order_number:'SYNTHETIC',created_at:'2026-10-20 09:40:47',customer_name:'Synthetic customer',customer_email:'synthetic@example.invalid',customer_phone:'99999999',customer_address:'قطعة 1 شارع 2 منزل 3 - Jahra - الجهراء - Kuwait',customer_city:'Jahra',customer_district:'الجهراء',notes:'Checkout note: '+hostile+' | Payment: cash | Billing: same',status:'pending',subtotal:18,shipping_cost:2,discount_amount:0,total:20,items:[{product_name:hostile,quantity:1,price:12,product_image:'javascript:alert(1)'},{product_name:'منتج تجريبي ثان',quantity:2,price:3,product_image:'/missing-qa-image.png'}]};
test('Kuwait presentation is timezone independent, deduplicates known locations and keeps unstructured street text',()=>{
 for(const tz of ['UTC','Asia/Kuwait','America/New_York']){process.env.TZ=tz;assert.match(P.formatDate(order.created_at,'en-US'),/12:40 PM/);assert.equal(P.date(order.created_at).toISOString(),'2026-10-20T09:40:47.000Z');}
 assert.equal(P.address(order),'الجهراء، قطعة 1 شارع 2 منزل 3، الكويت');
 assert.equal(P.address({...order,customer_city:'الجهراء',customer_address:'قطعة 1 - الجهراء - الكويت'}),'الجهراء، قطعة 1، الكويت');
 assert.equal(P.payment(order),'الدفع عند الاستلام');assert.equal(P.image('javascript:alert(1)'),'');
});
test('customer and merchant templates escape hostile fields and hide only zero discounts',async()=>{
 for(const discount of [0,2]){for(const admin of [false,true]){const html=(admin?email.buildAdminEmailHtml:email.buildCustomerEmailHtml)({order:{...order,discount_amount:discount,total:20-discount,customer_name:hostile}});assert(!html.includes('<svg'));assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(!html.includes('javascript:'));assert(html.includes('12:40')||html.includes('١٢:٤٠'));assert.equal(html.includes(admin?'>Discount<':'>الخصم<'),discount>0);assert(html.includes(admin?'20.000 KWD':'20.000 د.ك')||discount>0);assert(html.includes('Cash on delivery')||html.includes('الدفع عند الاستلام'));if(admin){assert(html.includes('https://wa.me/96599999999'));assert(!html.includes('965965'));assert(html.includes('order-details.html?id=900'));assert(html.includes('Open order'));}}}
 assert(email.buildAdminEmailHtml({order}).includes('href="tel:+96599999999">99999999</a>'));
 process.env.RESEND_API_KEY='synthetic';process.env.MAIL_FROM='kuwait-info@smart-kids.me';process.env.ADMIN_ORDERS_EMAIL='merchant@example.invalid';
 await email.sendOrderEmails({order});await email.sendOrderEmails({order});assert.equal(uniqueMail.size,2);assert(mailRequests.every(r=>r.message.from==='Smart Kids Kuwait <kuwait-info@smart-kids.me>'));assert.equal(mailRequests.filter(r=>r.message.to===order.customer_email).length,2);assert(mailRequests.filter(r=>r.message.to===order.customer_email).every(r=>r.message.subject==='تم استلام طلبك SYNTHETIC | Smart Kids Kuwait'));mailRequests.length=0;uniqueMail.clear();
});
test('temporary checkout and real browser previews: one reservation/mail pair/Purchase, private order API and safe mobile output',async()=>{
 const db=require('../db/turso-manager');await require('../scripts/security-demo-fixtures').seedSecurityDemo();
 await db.run('UPDATE products SET on_hand=100,committed=0,unavailable=0,stock=100 WHERE id=1');
 let server,app;try{
 const wrapper=require('express')();wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.SmartKidsPixel={trackPurchase:function(){}}'));
 wrapper.get('/qa-mail-customer',(req,res)=>res.send(email.buildCustomerEmailHtml({order})));
 wrapper.get('/qa-mail-admin',(req,res)=>res.send(email.buildAdminEmailHtml({order})));
 server=wrapper.listen(0,'127.0.0.1');await require('events').once(server,'listening');const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;process.env.STORE_SALES_PAUSED='0';app=require('../server');wrapper.use(app);
 const payload={checkoutKey:'synthetic_presentation_retry_12345',customerName:'Synthetic',customerEmail:'synthetic@example.invalid',customerPhone:'99999999',customerAddress:'Synthetic address',notes:'Payment: cash | Billing: same',items:[{productId:1,quantity:2}]};
 const create=()=>fetch(base+'/api/orders',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const first=await create();assert.equal(first.status,201);const saved=(await first.json()).data;
 const retries=await Promise.all([create(),create()]);assert(retries.every(r=>r.status===200));assert.equal(effects,1);assert.equal(capi,1);assert.equal(uniqueMail.size,2);
 assert.equal(Number((await db.get('SELECT COUNT(*) n FROM order_inventory WHERE order_id=?',[saved.id])).n),1);assert.equal(Number((await db.get('SELECT committed FROM products WHERE id=1')).committed),2);
 for(const endpoint of ['/api/orders/'+saved.id,'/api/orders/track/'+saved.order_number]){const r=await fetch(base+endpoint);assert([401,403].includes(r.status));assert(!(await r.text()).includes('synthetic@example.invalid'));}
 await require('../scripts/check-order-presentation-browser').checkOrderPresentationBrowser(base,{order});assert.equal(isolation.blockedEffects.length,0);
 }finally{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));app?.locals.adminAuth.close();(await db.ensureTursoClient()).close();}
});

test('actual CAPI builder uses public order number, canonical value and the same Browser event ID without network',async()=>{
 const oldFetch=global.fetch;process.env.META_PIXEL_ID='899390561983033';process.env.META_CAPI_TOKEN='synthetic-never-used';delete process.env.META_TEST_EVENT_CODE;
 let captured;
 global.fetch=async(url,options)=>{captured=JSON.parse(options.body);return {ok:true,text:async()=>JSON.stringify({events_received:1})};};
 try{
  const real=nativeLoad.call(module,'../services/meta-capi',module);
  await real.sendMetaPurchase({req:{headers:{}},order:{order_number:'SK4109',total:20,items:[{product_id:'3',quantity:1,price:18}]}});
  const event=captured.data[0];assert.equal(event.event_id,'purchase_SK4109');assert.equal(event.event_name,'Purchase');assert.equal(event.custom_data.order_id,'SK4109');assert.equal(event.custom_data.value,20);assert.equal(event.custom_data.currency,'KWD');assert(!captured.test_event_code);
  const source=require('fs').readFileSync(require('path').join(__dirname,'../public/thank-you.html'),'utf8');
  const f=source.slice(source.indexOf('    function getPurchaseEventId('),source.indexOf('    function hasPurchaseBeenTracked('));
  assert.equal(require('vm').runInNewContext(f+';getPurchaseEventId({order_number:"SK4109"})'),'purchase_SK4109');
  const invoice=email.buildInvoiceHtml({...order,customer_name:hostile});assert(invoice.includes('فاتورة الطلب'));assert(!invoice.includes('<svg'));assert(invoice.indexOf('عنوان الفاتورة')<invoice.indexOf('</body>'));
 }finally{global.fetch=oldFetch;}
});
