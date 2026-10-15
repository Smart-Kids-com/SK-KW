'use strict';
const isolation=require('./security-support');
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const db=require('../db/turso-manager'),M=require('../public/js/theme-model');let app,server,base,cookie,syntheticVideo;
async function request(route,{method='GET',body,admin=false}={}){const r=await fetch(base+route,{method,redirect:'manual',headers:{Origin:base,...(admin?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,headers:r.headers,data:await r.json()};}
before(async()=>{
 await require('../scripts/security-demo-fixtures').seedSecurityDemo();
 await db.run("INSERT INTO products(id,product_name,slug,sku,price,image_url,status,stock,on_hand,committed) VALUES(2,'منتج معاينة إضافي','demo-second','THEME-DEMO-2',8,'/sk-main-logo.webp','active',3,3,0)");
 await db.run('INSERT INTO collection_products(collection_id,product_id,sort_order) VALUES(1,2,1)');
 const wrapper=require('express')();wrapper.use((req,res,next)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-src 'self'; object-src 'none'");next();});
 wrapper.get('/test-media/clip.webm',(req,res)=>syntheticVideo?res.type('video/webm').send(syntheticVideo):res.sendStatus(404));
 wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.fbq=function(){};'));
 server=wrapper.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;process.env.PUBLIC_ORIGIN=base;process.env.STORE_SALES_PAUSED='1';app=require('../server');wrapper.use(app);
 const jar=new Map();for(const [route,body] of [['/admin-login',{password:process.env.ADMIN_PASSWORD_1,next:'/theme-admin'}],['/admin-otp',{otp:require('speakeasy').totp({secret:process.env.ADMIN_OTP_SECRET,encoding:'base32'}),next:'/theme-admin'}]]){const r=await fetch(base+route,{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:new URLSearchParams(body)});for(const item of r.headers.getSetCookie()){const [k,v]=item.split(';')[0].split('=');v?jar.set(k,v):jar.delete(k);}}
 assert(jar.has('sk_admin_session'));cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));app?.locals.adminAuth.close();(await db.ensureTursoClient()).close();});
test('theme draft is protected, persisted, conflict safe, published separately and restored to draft',async()=>{
 assert.equal((await request('/api/theme/editor/state')).status,401);
 const before=(await request('/api/theme/editor/state',{admin:true})).data.data;
 const doc=M.clone(before.draft);doc.global.desktop.color='#123456';
 const save=await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:before.revision,document:doc}});assert.equal(save.status,200);
 assert.equal((await request('/api/theme/published')).data.data.document.global.desktop.color,undefined);
 assert.equal((await request('/api/theme/editor/state',{admin:true})).data.data.draft.global.desktop.color,'#123456');
 const conflict=await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:before.revision,document:doc}});assert.equal(conflict.status,409);
 const pub=await request('/api/theme/editor/publish',{method:'POST',admin:true,body:{revision:save.data.data.revision}});assert.equal(pub.status,200);assert.equal((await request('/api/theme/published')).data.data.document.global.desktop.color,'#123456');
 const history=(await request('/api/theme/editor/history',{admin:true})).data.data;assert.equal(history.length,2);
 const changed=M.clone(doc);changed.global.desktop.color='#abcdef';const next=await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:pub.data.data.revision,document:changed}});
 const restore=await request('/api/theme/editor/restore/'+history[0].id,{method:'POST',admin:true,body:{revision:next.data.data.revision}});assert.equal(restore.status,200);assert.equal(restore.data.data.draft.global.desktop.color,'#123456');
 // Return the temporary fixture to an unchanged baseline for the browser scenario.
 const initial=M.clone(before.draft);await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:restore.data.data.revision,document:initial}});const s=(await request('/api/theme/editor/state',{admin:true})).data.data;await request('/api/theme/editor/publish',{method:'POST',admin:true,body:{revision:s.revision}});
});
test('theme rejects script URLs, CSS injection and stale writes; media is permanent and authenticated',async()=>{
 const s=(await request('/api/theme/editor/state',{admin:true})).data.data,doc=M.clone(s.draft);doc.global.desktop.backgroundImage='url(javascript:alert(1))';assert.equal((await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:s.revision,document:doc}})).status,400);
 const b=M.newBlock('button');b.content.href='javascript:alert(1)';doc.global.desktop={};doc.pages.home={sections:[b]};assert.equal((await request('/api/theme/editor/draft',{method:'PUT',admin:true,body:{revision:s.revision,document:doc}})).status,400);
 assert.equal((await request('/api/theme/editor/assets',{method:'POST',body:{}})).status,401);
 assert.equal((await request('/api/theme/editor/assets',{method:'POST',admin:true,body:{name:'bad.svg',mime:'image/svg+xml',data:'PHN2Zz4=',width:1,height:1}})).status,400);
 const media={name:'synthetic.png',mime:'image/png',width:1,height:1,data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6h9sAAAAASUVORK5CYII='};const upload=await request('/api/theme/editor/assets',{method:'POST',admin:true,body:media});assert.equal(upload.status,201);const asset=upload.data.data;assert((await request('/api/theme/editor/assets',{admin:true})).data.data.some(a=>a.id===asset.id));
 const r=await fetch(base+asset.url);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await r.arrayBuffer()).toString('base64'),media.data);
 assert.equal((await fetch(base+'/admin')).headers.get('x-frame-options'),'DENY');assert.equal((await fetch(base+'/index.html?theme_preview=1')).headers.get('x-frame-options'),'SAMEORIGIN');
 assert.equal(isolation.blockedEffects.length,0);
});
test('named themes are independent, conflict safe and history is scoped; new pages remain unpublished',async()=>{
 const current=(await request('/api/theme/editor/state',{admin:true})).data.data;
 const created=await request('/api/theme/editor/themes',{method:'POST',admin:true,body:{source:'published',name:'Independent draft'}});assert.equal(created.status,201);const copy=created.data.data;
 const renamed=await request('/api/theme/editor/themes/'+copy.id+'/name',{method:'PUT',admin:true,body:{name:'Renamed draft'}});assert.equal(renamed.data.data.name,'Renamed draft');
 const doc=M.clone(copy.draft);doc.customPages={page_isolated:{name:'Isolated page'}};doc.pages.page_isolated={sections:[M.newBlock('image_text')]};doc.global.customCSS='.sk-header { border-radius: 8px; }';
 const saved=await request('/api/theme/editor/draft?theme='+copy.id,{method:'PUT',admin:true,body:{revision:copy.revision,document:doc}});assert.equal(saved.status,200);
 assert.equal((await request('/api/theme/editor/state',{admin:true})).data.data.revision,current.revision);
 assert.equal((await fetch(base+'/theme-page/isolated')).status,404);assert.equal((await fetch(base+'/theme-page/isolated?theme_preview=1&theme='+copy.id,{headers:{Cookie:cookie}})).status,200);
 assert.equal((await request('/api/theme/editor/draft?theme='+copy.id,{method:'PUT',admin:true,body:{revision:copy.revision,document:doc}})).status,409);
 const history=(await request('/api/theme/editor/history?theme='+copy.id,{admin:true})).data.data;assert.equal(history.length,1);
 assert.equal((await request('/api/theme/editor/restore/'+history[0].id,{method:'POST',admin:true,body:{revision:current.revision}})).status,404);
 const published=await request('/api/theme/editor/publish?theme='+copy.id,{method:'POST',admin:true,body:{revision:saved.data.data.revision}});assert.equal(published.status,200);assert.equal((await fetch(base+'/theme-page/isolated')).status,200);
 doc.global.customCSS='body { background: url(https://external.invalid); }';assert.equal((await request('/api/theme/editor/draft?theme='+copy.id,{method:'PUT',admin:true,body:{revision:published.data.data.revision,document:doc}})).status,400);
 assert.equal((await request('/api/theme/editor/themes')).status,401);
 await request('/api/theme/editor/publish',{method:'POST',admin:true,body:{revision:current.revision}});
});
test('theme actual Chrome editing, reload, ordering, undo, responsive overrides and page coverage',async()=>{
 const before=JSON.stringify({orders:await db.all('SELECT id,total,status FROM orders ORDER BY id'),products:await db.all('SELECT id,price,on_hand,committed,stock FROM products ORDER BY id')});
 const original=await db.get('SELECT id,product_name,image_url,price FROM products WHERE id=1');await require('../scripts/check-theme-browser').checkThemeBrowser(base,{cookie,video:async data=>syntheticVideo=Buffer.from(data,'base64'),catalogChange:async restore=>{const values=restore?original:{...original,product_name:'كتالوج محدّث تجريبي',image_url:'/icon-whatsapp.webp',price:6.125};await db.run('UPDATE products SET product_name=?,image_url=?,price=? WHERE id=1',[values.product_name,values.image_url,values.price]);return {name:values.product_name,price:values.price};}});assert.equal(isolation.blockedEffects.length,0);
 assert.equal(JSON.stringify({orders:await db.all('SELECT id,total,status FROM orders ORDER BY id'),products:await db.all('SELECT id,price,on_hand,committed,stock FROM products ORDER BY id')}),before);
});
