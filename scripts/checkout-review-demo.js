'use strict';
// Loopback review only: install transport/database guards before importing the app.
const Module=require('node:module'),nativeLoad=Module._load;
const isolation=require('../tests/security-support'),isolatedLoad=Module._load;
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const messages=[],ids=new Map();let email;
Module._load=function(name,parent,isMain){
 if(name==='resend')return {Resend:class{constructor(){this.emails={send:async(message,options)=>{
   const key=options?.idempotencyKey;if(!ids.has(key)){ids.set(key,'local-mail-'+(messages.length+1));messages.push({...message,id:ids.get(key)});}return {data:{id:ids.get(key)}};
 }};}}};
 if(name.endsWith('/utils/email'))return email;
 if(name.endsWith('/services/meta-capi'))return {sendMetaPurchase:async()=>({skipped:true,reason:'isolated review'}),buildPurchaseEventId:o=>'purchase_'+o.order_number};
 return isolatedLoad.call(this,name,parent,isMain);
};
email=nativeLoad.call(module,'../utils/email',module);
const port=Number(process.env.REVIEW_PORT||5410),base='http://127.0.0.1:'+port;
process.env.PUBLIC_ORIGIN=base;process.env.STORE_SALES_PAUSED='0';process.env.RESEND_API_KEY='local-mock';process.env.MAIL_FROM='kuwait-info@smart-kids.me';process.env.ADMIN_ORDERS_EMAIL='merchant@example.invalid';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(kind='cash'){
 const bad=kind==='hostile',english=kind==='english';
 return {id:900,order_number:'LOCAL-REVIEW',created_at:'2026-10-20 09:40:47',customer_name:bad?'<img src=x onerror="window.pwned=1">':'عميل تجريبي',customer_email:'buyer@example.invalid',customer_phone:'99999999',customer_address:english?'Block 1 Street 2 House 3 - Jahra - Kuwait':'قطعة 1 شارع 2 منزل 3 - الجهراء - الكويت',customer_city:english?'Jahra':'الجهراء',customer_district:'الجهراء',status:'pending',notes:'Checkout note: Local review | Payment: '+(kind==='link'?'link':'cash')+' | Billing: same',subtotal:18,shipping_cost:2,discount_amount:kind==='discount'?2:0,total:kind==='discount'?18:20,items:[{product_id:'1',product_name:bad?'<svg onload="window.pwned=1"> منتج تجريبي':'كتاب أنشطة عربي طويل الاسم للأطفال للتجربة على شاشة صغيرة',quantity:1,price:12,product_image:kind==='missing'?base+'/review/missing.png':base+'/sk-main-logo.webp'},{product_id:'2',product_name:'مجموعة أنشطة إضافية',quantity:2,price:3,product_image:base+'/sk-main-logo.webp'}]};
}
async function start(){
 const db=await require('./security-demo-fixtures').seedSecurityDemo();
 await require('../db/purchase-browser-receipts-migration').migratePurchaseBrowserReceipts(db);
 await db.run('UPDATE products SET price=12,product_name=?,image_url=?,on_hand=100,committed=0,stock=100 WHERE id=1',[fixture().items[0].product_name,base+'/sk-main-logo.webp']);
 await db.run('INSERT INTO products(id,product_name,slug,sku,price,status,image_url,on_hand,committed,unavailable,stock,inventory_enabled,inventory_blocked) VALUES(2,?,?,?,?,?,?,?,?,?,?,?,?)',['مجموعة أنشطة إضافية','review-second','REVIEW-2',3,'active',base+'/sk-main-logo.webp',100,0,0,100,1,0]);
 const app=express();
 app.use((req,res,next)=>{res.set('Cache-Control','no-store').set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; font-src 'self'; form-action 'self'; object-src 'none'");next();});
 app.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.fbq=function(){};window.SmartKidsPixel={trackPurchase:function(o){window.__reviewPurchase=o},trackInitiateCheckout:function(){}};'));
 app.get('/review/state',(req,res)=>res.json({messages:messages.map(({id,to,subject})=>({id,to,subject})),temporaryDatabase:true,externalEffects:isolation.blockedEffects.length}));
 app.get('/review/fixture/:kind',(req,res)=>res.json(fixture(req.params.kind)));
 app.get('/review/thanks/:kind',(req,res)=>res.send(`<script>localStorage.setItem('last_order',${JSON.stringify(JSON.stringify(fixture(req.params.kind)))});sessionStorage.removeItem('pixel_purchase_sent_LOCAL-REVIEW');location.href='/thank-you.html?order=LOCAL-REVIEW'</script>`));
 app.get('/review/start/:kind',(req,res)=>{const o=fixture(req.params.kind);res.send(`<script>localStorage.setItem('cart',${JSON.stringify(JSON.stringify(o.items.map(i=>({id:i.product_id,name:i.product_name,price:i.price,quantity:i.quantity,image:i.product_image}))))});sessionStorage.setItem('review-prefill',${JSON.stringify(JSON.stringify(o))});localStorage.removeItem('cart_discount_code');location.href='/checkout.html';</script>`)});
 app.get('/checkout.html',(req,res)=>{let html=fs.readFileSync(path.join(__dirname,'../public/checkout.html'),'utf8');html=html.replace('</body>',`<script>document.addEventListener('DOMContentLoaded',()=>{let o;try{o=JSON.parse(sessionStorage.getItem('review-prefill'));}catch{}if(!o)return;sessionStorage.removeItem('review-prefill');for(const [id,value] of Object.entries({firstName:'عميل',lastName:'تجريبي',contactField:'buyer@example.invalid',phone:'99999999',city:o.customer_city,governorate:o.customer_district,address1:o.customer_address.split(' - ')[0]})){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('input[name=payment][value='+(/Payment: link/.test(o.notes)?'link':'cash')+']').click();});</script></body>`);res.send(html)});
 app.get('/review/email/:audience',(req,res)=>res.send((req.params.audience==='admin'?email.buildAdminEmailHtml:email.buildCustomerEmailHtml)({order:fixture(req.query.case)}).replaceAll('https://smartkidskw.com/order-details.html',base+'/order-details.html')));
 app.get('/review/mail/:id',(req,res)=>{const m=messages.find(m=>m.id===req.params.id);m?res.send(m.html.replaceAll('https://smartkidskw.com/order-details.html',base+'/order-details.html')):res.sendStatus(404)});
 app.get('/review/',(req,res)=>res.send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>مراجعة Checkout محليًا</title><style>body{font:16px Tahoma;max-width:900px;margin:25px auto;padding:16px;background:#f6f2f8;line-height:2}a{display:inline-block;padding:7px 12px;margin:4px;background:white;color:#4a064f;border-radius:8px}section{padding:12px;border:1px solid #ddd;margin:12px 0}code{direction:ltr;display:inline-block}</style><h1>تجربة محلية معزولة</h1><p>قاعدة مؤقتة وبريد ملتقط محليًا. Pixel وMeta والبريد الحقيقي والاتصالات الخارجية محجوبة. لا توجد بيانات إنتاج.</p>${['cash','link','discount','english','missing','hostile'].map(k=>`<section><strong>${esc(k)}</strong><br><a href="/review/start/${k}">Checkout</a><a href="/review/thanks/${k}">Thank-you</a><a href="/review/email/customer?case=${k}">رسالة العميل</a><a href="/review/email/admin?case=${k}">رسالة التاجر</a></section>`).join('')}<p>سيناريو discount يعرض خصمًا وهميًا مقداره 2 في المعاينة. لتجربة Checkout الحقيقي محليًا استخدم الكود DEMO10.</p><h2>Mail transport المحلي</h2><div id="mail"></div><script>async function refresh(){const d=await fetch('/review/state').then(r=>r.json());const box=document.getElementById('mail');box.replaceChildren();for(const m of d.messages){const a=document.createElement('a');a.href='/review/mail/'+m.id;a.textContent=m.to+' — '+m.subject;box.append(a)}}refresh();setInterval(refresh,2500);</script></html>`));
 const actual=require('../server');app.use(actual);const server=app.listen(port,'127.0.0.1');await require('events').once(server,'listening');
 fs.writeFileSync('checkout-review-demo-state.local.json',JSON.stringify({url:base+'/review/',pid:process.pid,directory:isolation.directory},null,2));console.log('Isolated review ready: '+base+'/review/');
 const close=async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));actual.locals.adminAuth.close();(await db.ensureTursoClient()).close()};
 process.on('SIGTERM',()=>{close().finally(()=>process.exit(0))});
 return {base,close};
}
if(require.main===module)start().catch(e=>{console.error('Local review failed: '+e.message);process.exitCode=1});
module.exports={start};
