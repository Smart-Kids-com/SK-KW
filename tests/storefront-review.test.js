'use strict';
const isolation=require('./security-support');
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events'),fs=require('node:fs');
const db=require('../db/turso-manager');let app,server,base,cookie,uploaded,created;
async function request(path,body,method='GET',authenticated=true){const r=await fetch(base+path,{method,headers:{Origin:base,...(authenticated?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});return {status:r.status,headers:r.headers,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};}
before(async()=>{
  await require('../scripts/security-demo-fixtures').seedSecurityDemo();await require('../scripts/products-demo-fixtures').seedProducts(db);
  await require('../db/collections-editor-migration').migrateCollectionsEditor(db);await require('../db/orders-admin-migration').migrateOrdersAdmin(db);await require('../db/discounts-editor-migration').migrateDiscounts(db);
  await db.run("UPDATE collections SET status='active',online_store=1 WHERE id=1");
  await db.run('INSERT INTO collection_products(collection_id,product_id,sort_order) SELECT 1,id,id FROM products WHERE id>1');
  await db.run("UPDATE products SET product_name='Catalog target beyond page one',sku='PAGE-TARGET' WHERE id=3");
  await db.run('UPDATE products SET product_name=?,sale_price=0.2 WHERE id=6',['<img src=x onerror="window.__storeXss=1"> عنوان عربي طويل كامل محفوظ كنص آمن']);
  const wrapper=require('express')();wrapper.use((req,res,next)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'");next();});
  wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.fbq=function(){};'));
  server=wrapper.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;process.env.STORE_SALES_PAUSED='1';app=require('../server');wrapper.use(app);
  const jar=new Map();for(const [route,body] of [['/admin-login',{password:process.env.ADMIN_PASSWORD_1}],['/admin-otp',{otp:require('speakeasy').totp({secret:process.env.ADMIN_OTP_SECRET,encoding:'base32'})}]]){const r=await fetch(base+route,{method:'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:new URLSearchParams(body)});for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');v?jar.set(k,v):jar.delete(k);}}cookie=[...jar].map(([k,v])=>k+'='+v).join('; ');assert(jar.has('sk_admin_session'));
});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));app?.locals.adminAuth.close();(await db.ensureTursoClient()).close();});
test('global search is authenticated, bounded, literal and grouped, including products beyond page one',async()=>{
  assert.equal((await request('/api/admin-dashboard/global-search?q=target',null,'GET',false)).status,401);
  const result=await request('/api/admin-dashboard/global-search?q=target');assert.equal(result.status,200);assert(result.data.data.Products.some(p=>p.url==='/product-edit.html?id=3'));
  assert(Object.values(result.data.data).every(rows=>rows.length<=5));assert.equal((await request('/api/admin-dashboard/global-search?q='+('x'.repeat(81)))).status,400);
  assert(Object.values((await request('/api/admin-dashboard/global-search?q=%25_%27')).data.data).every(rows=>!rows.length));
});
test('collection SEO save/reload, defaults, duplicate slug, stale revision and escaped server HTML',async()=>{
  const S=require('../services/collections-editor'),c=await S.get(db,1),saved=await S.save(db,1,{revision:c.revision,seo_title:'SEO <script>literal</script>',seo_description:'Description & details'});
  assert.equal((await S.get(db,1)).seo_title,saved.seo_title);assert.equal(saved.slug,c.slug);
  await assert.rejects(S.save(db,1,{revision:c.revision,title:'Stale'}),e=>e.status===409);
  await assert.rejects(S.save(db,1,{revision:saved.revision,seo_title:'x'.repeat(71)}),e=>e.status===400);
  let page=await request('/collection.html?slug='+encodeURIComponent(c.slug),null,'GET',false);assert.equal(page.status,200);assert(page.data.includes('SEO &lt;script&gt;literal&lt;/script&gt;'));assert(page.data.includes('rel="canonical"'));assert(page.data.includes('property="og:description"'));assert(!page.data.includes('<title id="pageTitle">SEO <script>'));
  await S.save(db,1,{revision:saved.revision,seo_title:'',seo_description:''});page=await request('/collection.html?id=1',null,'GET',false);assert(page.data.includes(c.title));
});
test('real PNG upload, product image create/reopen/replace/remove, public status and invalid/oversize input',async()=>{
  const image=fs.readFileSync('public/brand/icon-96.png'),body={name:'temporary-image.png',mime:'image/png',data:image.toString('base64'),width:96,height:96};
  const upload=await request('/api/theme/editor/assets',body,'POST');assert.equal(upload.status,201);uploaded=upload.data.data.url;
  const publicImage=await request(uploaded,null,'GET',false);assert.equal(publicImage.status,200);assert.equal(publicImage.headers.get('content-type'),'image/png');
  assert.equal((await request('/api/theme/editor/assets',{...body,data:Buffer.from('not an image').toString('base64')},'POST')).status,400);
  assert.equal((await request('/api/theme/editor/assets',{...body,data:Buffer.alloc(2*1024*1024+1,1).toString('base64')},'POST')).status,400);
  const product=await request('/api/products',{productName:'Uploaded local product',price:6,stock:8,status:'active',images:[{image_url:uploaded}]},'POST');assert.equal(product.status,201);created=product.data.data;
  assert.equal((await request('/api/products/'+created.id)).data.data.primary_image,uploaded);
  const S=require('../services/collections-editor');await S.memberships(db,1,{ids:[created.id]});
  assert((await S.items(db,1,{search:'Uploaded local product'},true)).rows.some(p=>p.id===created.id&&p.primary_image===uploaded));
  const listed=await request('/api/products?status=active&search=Uploaded%20local%20product&includeImages=true',null,'GET',false);assert(listed.data.data.some(p=>p.id===created.id&&p.primary_image===uploaded));
  const persisted=require('@libsql/client').createClient({url:process.env.DATABASE_URL});try{assert.equal((await persisted.execute({sql:'SELECT mime,bytes FROM theme_editor_media WHERE id=?',args:[upload.data.data.id]})).rows[0].bytes,image.length);}finally{persisted.close();}

  assert.equal((await request('/api/products',{productName:'Invalid URL',price:1,images:['javascript:alert(1)']},'POST')).status,400);
  const original=await db.get('SELECT price,stock,on_hand,committed,unavailable,product_name,slug FROM products WHERE id=?',[created.id]);
  for(const status of ['draft','archived']){assert.equal((await request('/api/products/'+created.id,{status},'PUT')).status,200);assert.equal((await request('/api/products/'+created.id,null,'GET',false)).status,404);assert.deepEqual(await db.get('SELECT price,stock,on_hand,committed,unavailable,product_name,slug FROM products WHERE id=?',[created.id]),original);}
  await request('/api/products/'+created.id,{status:'active',images:[{image_url:'./brand/icon-48.png'}]},'PUT');assert.equal((await request('/api/products/'+created.id)).data.data.primary_image,'/brand/icon-48.png');
  await request('/api/products/'+created.id,{images:[],imageUrl:''},'PUT');assert.equal((await request('/api/products/'+created.id)).data.data.primary_image,'');
  // Removing a product reference never deletes a shared content-addressed media object.
  assert.equal((await request(uploaded,null,'GET',false)).status,200);
});
test('theme display options save/reopen in draft without modifying published theme',async()=>{
  const S=require('../services/theme-editor'),state=await S.state(db),published=JSON.stringify(state.published),document=structuredClone(state.draft);
  document.global.collectionHeader={showHeader:true,showTitle:true,showDescription:false,showImage:true};document.global.storefrontCategories=['Books','Toys'];
  await S.save(db,document,state.revision,'draft');const again=await S.state(db);assert.deepEqual(again.draft.global.storefrontCategories,['Books','Toys']);assert.equal(JSON.stringify(again.published),published);
  assert.throws(()=>require('../public/js/theme-model').validate({...document,global:{...document.global,storefrontCategories:Array(6).fill('category')}}));
});
test('same-origin icons have correct MIME, dimensions and public accessibility',async()=>{
  for(const name of ['/favicon.ico','/site.webmanifest','/brand/icon-48.png','/brand/icon-96.png','/brand/icon-192.png','/brand/icon-180.png'])assert.equal((await request(name,null,'GET',false)).status,200,name);
  for(const size of [48,96,192]){const data=fs.readFileSync('public/brand/icon-'+size+'.png');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
});
test('shared product media survives a disposable theme draft deletion and renders absolute mail image URLs',async()=>{
  const png=fs.readFileSync('public/brand/icon-96.png');
  const upload=await request('/api/theme/editor/assets',{name:'shared-media-proof',mime:'image/png',data:png.toString('base64'),width:96,height:96},'POST');
  assert.equal(upload.status,201);const media=upload.data.data;
  await request('/api/products/1',{images:[{image_url:media.url}]},'PUT');
  const copy=await require('../services/theme-editor').duplicate(db,'current','Disposable media proof');
  assert.equal((await db.all('PRAGMA foreign_key_list(theme_editor_media)')).length,0);
  await db.run('DELETE FROM theme_editor_library WHERE id=?',[copy.id]);
  assert(await db.get('SELECT id FROM theme_editor_media WHERE id=?',[media.id]));
  const bytes=Buffer.from(await (await fetch(base+media.url)).arrayBuffer());assert.deepEqual(bytes,png);
  const presentation=require('../public/js/order-presentation');assert.equal(presentation.image(media.url),base+media.url);
  // Compile the real renderers under the installed no-network/no-mail guards;
  // never call delivery functions or instantiate a provider.
  const Module=require('node:module'),filename=require.resolve('../utils/email'),renderers=new Module(filename,module);
  renderers.filename=filename;renderers.paths=module.paths;renderers._compile(fs.readFileSync(filename,'utf8'),filename);
  const order={id:1,order_number:'LOCAL-MEDIA-PROOF',customer_name:'Local fixture',created_at:'2026-10-23 10:00:00',subtotal:1,total:1,shipping_cost:0,items:[{product_name:'Image fixture',product_image:media.url,price:1,quantity:1}]};
  for(const html of [renderers.exports.buildCustomerEmailHtml({order}),renderers.exports.buildAdminEmailHtml({order}),renderers.exports.buildInvoiceHtml(order)])assert(html.includes(base+media.url));
  assert.equal(isolation.blockedEffects.length,0);
});
test('cart feedback stays accurate for sale/multiple products, unavailable stock, quantity/removal and navigation',async()=>{
  await require('../scripts/check-admin-read-browser').checkAdminReadBrowser(base,{cookie,run:async({cdp,evaluate,wait,sleep})=>{
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:true});
    await cdp('Page.navigate',{url:base+'/products-full.html'});await wait('window.__SKStorefrontCatalog?.rows.length===24');await evaluate('localStorage.removeItem("cart")');
    async function search(value){await evaluate(`document.querySelector('.sk-catalog-search input').value=${JSON.stringify(value)};document.querySelector('.sk-catalog-search input').dispatchEvent(new Event('input',{bubbles:true}))`);}
    await search('PAGE-TARGET');await wait('window.__SKStorefrontCatalog?.rows.length===1&&window.__SKStorefrontCatalog.rows[0]===3');await evaluate('document.querySelector(".sk-card-cart").click()');await wait('JSON.parse(localStorage.getItem("cart")||"[]").length===1');
    await search('TEST-SKU-0006');await wait('window.__SKStorefrontCatalog.rows.length===1&&window.__SKStorefrontCatalog.rows[0]===6');await evaluate('document.querySelector(".sk-card-cart").click()');await wait('JSON.parse(localStorage.getItem("cart")||"[]").length===2');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("cart")).find(p=>p.id===6).price'),0.2);assert(!await evaluate('window.__storeXss'));
    await search('TEST-SKU-0021');await wait('window.__SKStorefrontCatalog.rows.length===1&&window.__SKStorefrontCatalog.rows[0]===21');assert(await evaluate('!document.querySelector(".sk-card-cart")&&!!document.querySelector(".sk-sold-out")'));assert.equal(await evaluate('JSON.parse(localStorage.getItem("cart")).length'),2);
    await cdp('Page.navigate',{url:base+'/cart.html'});await wait('location.pathname==="/cart.html"&&window.SKStorefront&&typeof increaseQty==="function"&&document.querySelector(".sk-floating-cart")');await evaluate('increaseQty(0)');await wait('document.querySelector(".sk-cart-count").textContent==="3"');await evaluate('removeItem(1)');await wait('document.querySelector(".sk-cart-count").textContent==="2"');const priorOrigin=await evaluate('performance.timeOrigin');await cdp('Page.reload');await wait('performance.timeOrigin!=='+priorOrigin+'&&document.querySelector(".sk-cart-count")?.textContent==="2"&&typeof removeItem==="function"&&document.readyState==="complete"');await evaluate('removeItem(0)');await wait('document.querySelector(".sk-floating-cart").hidden');
    // Delay one catalog request: loading stays visible until data arrives.
    await cdp('Page.navigate',{url:base+'/products-full.html'});await wait('window.__SKStorefrontCatalog?.rows.length===24');await evaluate(`window.__originalFetch=fetch;window.fetch=(...args)=>String(args[0]).startsWith('/api/products?')?new Promise(resolve=>setTimeout(()=>resolve(window.__originalFetch(...args)),500)):window.__originalFetch(...args);document.querySelector('.sk-catalog-search input').value='PAGE-TARGET';document.querySelector('.sk-catalog-search input').dispatchEvent(new Event('input',{bubbles:true}))`);await wait('document.querySelector(".sk-catalog-status").textContent.includes("جاري")');await wait('window.__SKStorefrontCatalog.rows.length===1');await evaluate('window.fetch=window.__originalFetch');
    await cdp('Page.navigate',{url:base+'/product-page.html?id=3'});await wait('document.readyState==="complete"');await cdp('Page.navigate',{url:base+'/products-full.html'});await wait('window.__SKStorefrontCatalog.rows.length===24');
  }});
  assert.equal(isolation.blockedEffects.length,0);
});
test('all administration APIs expose actual isolated data without changing application data',async()=>{
  const expected=[['/api/products/admin/list?limit=25',d=>d.rows.length===25&&d.pagination.total>=237],['/api/orders/admin/list?limit=25',d=>d.rows.length===2&&d.total===2],['/api/collections/admin/list?limit=25',d=>d.rows.length===1],['/api/theme/editor/state',d=>d.draft&&d.published],['/api/discounts?limit=25',d=>d.length>=1]];
  const evidence=[];for(const [url,valid] of expected){const start=Date.now(),result=await request(url);assert.equal(result.status,200,url);assert(valid(result.data.data),url+' actual data');evidence.push({url,ms:Date.now()-start});}
  fs.writeFileSync('storefront-admin-data-result.local.json',JSON.stringify(evidence,null,2));
});
test('Chrome desktop/mobile catalog, cards, search, cart deduplication, navigation, scrolling and safe text',async()=>{
  const result=await require('../scripts/check-admin-read-browser').checkAdminReadBrowser(base,{cookie,run:async({cdp,evaluate,wait,sleep})=>{
    const results=[];
    for(const width of [1280,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});await cdp('Emulation.setTouchEmulationEnabled',{enabled:width<500});
      for(const path of ['/products-full.html','/collection.html?id=1']){
        await cdp('Page.navigate',{url:base+path});await wait('window.__SKStorefrontCatalog?.rows.length===24');await wait('document.querySelector(".sk-header")');
        assert(await evaluate('Math.abs(document.querySelector(".sk-header-logo").getBoundingClientRect().left+document.querySelector(".sk-header-logo").getBoundingClientRect().width/2-document.documentElement.clientWidth/2)<2'),'logo centered');
        assert(await evaluate('[...document.querySelectorAll(".sk-header .sk-header-icon-btn")].every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)'),'44px targets');
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),path+' fits '+width);
        await evaluate('[...document.querySelectorAll(".sk-product-card img")].forEach(i=>i.loading="eager")');await wait('[...document.querySelectorAll(".sk-product-card img")].every(i=>i.complete&&i.naturalWidth>0)');
        await evaluate(`document.querySelector('.sk-catalog-search input').value='PAGE-TARGET';document.querySelector('.sk-catalog-search input').dispatchEvent(new Event('input',{bubbles:true}))`);
        await wait('window.__SKStorefrontCatalog?.rows.length===1&&window.__SKStorefrontCatalog.rows[0]===3');
        await evaluate('localStorage.removeItem("cart");document.querySelector(".sk-card-cart").click();document.querySelector(".sk-card-cart").click()');
        await wait('JSON.parse(localStorage.getItem("cart")||"[]")[0]?.quantity===1');await sleep(300);
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("cart"))[0].quantity'),1);
        assert.equal(await evaluate('document.querySelectorAll(".sk-floating-cart").length'),1);
        await sleep(650);assert(await evaluate('document.querySelector(".sk-floating-cart.expanded .sk-cart-message")'),'count polling preserves the success message');
        await sleep(1400);assert(!(await evaluate('document.querySelector(".sk-floating-cart").classList.contains("expanded")')));
        await evaluate(`document.querySelector('.sk-catalog-search input').value='TEST-SKU-0006';document.querySelector('.sk-catalog-search input').dispatchEvent(new Event('input',{bubbles:true}))`);await wait('window.__SKStorefrontCatalog.rows.length===1&&window.__SKStorefrontCatalog.rows[0]===6');
        assert(await evaluate('document.querySelector(".product-title").textContent.includes("<img src=x")&&!window.__storeXss&&!document.querySelector(".product-title img")'),'unsafe title remains literal');
        await evaluate(`document.querySelector('.sk-catalog-search input').value='no-matching-product-xyz';document.querySelector('.sk-catalog-search input').dispatchEvent(new Event('input',{bubbles:true}))`);await wait('window.__SKStorefrontCatalog.rows.length===0');assert(await evaluate('document.querySelector(".sk-catalog-status").textContent.length>0'));
        await evaluate(`window.__originalFetch=window.fetch;window.fetch=(...args)=>String(args[0]).startsWith('/api/products?')||/\\/api\\/collections\\/\\d+\\/products\\?/.test(String(args[0]))?Promise.reject(new Error('Simulated offline')):window.__originalFetch(...args);document.querySelector('.sk-catalog-search button').click()`);await wait('document.querySelector(".sk-catalog-status").textContent.includes("Simulated offline")');await evaluate('window.fetch=window.__originalFetch');
        await cdp('Page.reload');await wait('window.__SKStorefrontCatalog?.rows.length===24');assert.equal(await evaluate('JSON.parse(localStorage.getItem("cart"))[0].quantity'),1);
        results.push({path,width,searchBeyondFirstPage:true,cartRapidClickOnce:true,images:true});
      }
      await cdp('Page.navigate',{url:base+'/products-admin'});await wait('document.querySelectorAll("#rows tr[data-id]").length===25');await wait('document.querySelector(".sk-nav-toggle")');
      for(const collapsed of [false,true]){
        if(width===1280)await evaluate(`if(document.querySelector('.admin-layout').classList.contains('nav-collapsed')!==${collapsed})document.querySelector('.sk-nav-toggle').click()`);
        await evaluate('scrollTo(0,0)');await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.round(width*.6),y:600,deltaX:0,deltaY:550});await sleep(200);assert(await evaluate('scrollY>0'),'wheel over table '+width);
        await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.round(width*.6),y:400,deltaX:0,deltaY:-550});await sleep(200);if(await evaluate('scrollY')!==0){console.log('Wheel upward diagnostic',await evaluate('JSON.stringify({y:scrollY,hit:document.elementFromPoint(innerWidth*.6,400)?.outerHTML.slice(0,200),bodyOverflow:getComputedStyle(document.body).overflowY,tableTop:document.querySelector(".table-scroll").scrollTop})'));}await wait('scrollY===0');
        await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await sleep(250);assert(await evaluate('scrollY>0'));
        if(width<500){await evaluate('scrollTo(0,0)');await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:Math.round(width*.6),y:600}]});for(let i=1;i<=8;i++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(width*.6),y:600-i*20}]});await sleep(25);}await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(200);assert(await evaluate('scrollY>0'),'touch scroll over table');}
      }
      await evaluate('scrollTo(0,0);document.querySelector(".sk-admin-search input").value="PAGE-TARGET";document.querySelector(".sk-admin-search input").dispatchEvent(new Event("input",{bubbles:true}))');await wait('document.querySelector("#admin-search-results a")');
      await evaluate('document.querySelector(".sk-admin-search input").focus()');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});assert(await evaluate('document.activeElement.matches("#admin-search-results a")'));await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert(await evaluate('document.querySelector("#admin-search-results").hidden'));
      await evaluate('document.getElementById("columns").click()');await wait('document.querySelector("dialog[open]")');assert(await evaluate('getComputedStyle(document.body).overflowY==="hidden"'));await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait('!document.querySelector("dialog[open]")');assert(await evaluate('getComputedStyle(document.body).overflowY!=="hidden"'));
      for(const selector of ['.table-scroll','.filters','main']){
        await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'});scrollBy(0,-100)`);await sleep(80);
        const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.min(innerWidth-25,Math.max(25,r.left+r.width/2)),y:Math.min(innerHeight-90,Math.max(110,r.top+Math.min(r.height/2,200)))}})()`),before=await evaluate('scrollY');
        for(let step=0;step<4;step++){await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:point.x,y:point.y,deltaX:0,deltaY:45});await sleep(40);}await sleep(80);assert(await evaluate('scrollY')>before,'trackpad over '+selector);
      }
      results.push({page:'Products scroll',width,wheel:true,keyboard:true});
      for(const [path,page] of [['/product-edit.html?id=1','products'],['/order-details.html?id=1','orders'],['/customers-view.html?id=1','customers']]){
        await cdp('Page.navigate',{url:base+path});await wait('document.querySelector("[data-admin-navigation] [aria-current=page]")');assert.equal(await evaluate('document.body.dataset.adminPage'),page);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),path+' detail fits '+width);results.push({path,width,sharedNavigation:true});
      }
    }
    await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:850,deviceScaleFactor:1,mobile:false});
    for(const [name,path,ready] of [
      ['Dashboard','/admin-enhanced','document.getElementById("ordersValue")?.textContent==="2"&&!state.loading'],
      ['Orders','/orders-admin.html','window.__SKOrdersList?.total===2'],
      ['Collections','/collections-admin','document.querySelectorAll("#rows input[type=checkbox]").length===1'],
      ['Inventory','/inventory-admin.html','document.querySelectorAll("#inventoryTableBody .row-select").length===30'],
      ['Customers','/customers-admin','document.querySelectorAll("#customersTableBody tr").length===1&&!document.getElementById("customersTableBody").textContent.includes("Loading")'],
      ['Theme','/theme-admin','document.querySelector("#published-theme .theme-card")'],
      ['Discounts','/discounts-admin','document.querySelector("#rows button[data-action=edit]")']
    ]){const started=Date.now();await cdp('Page.navigate',{url:base+path});await wait(ready);results.push({page:name,width:1280,actualData:true,ms:Date.now()-started});}
    await cdp('Page.navigate',{url:base+'/collection-edit.html?id=1'});await wait('window.__SKCollectionEditor?.collection?.id===1');await evaluate('document.getElementById("seo_title").value="Browser SEO title";document.getElementById("seo_title").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("save").click()');await wait('!window.__SKCollectionEditor.dirty&&window.__SKCollectionEditor.collection.seo_title==="Browser SEO title"');await cdp('Page.reload');await wait('document.getElementById("seo_title")?.value==="Browser SEO title"');results.push({page:'Collection SEO',browserSaveReload:true});
    await cdp('Page.navigate',{url:base+'/theme-editor.html?theme=current'});await wait('window.__SKThemeEditor');await evaluate('document.getElementById("global").click();[...document.querySelectorAll("#settings-pane button")].find(b=>b.textContent==="Catalog display").click()');await wait('document.getElementById("collection-showHeader")');await evaluate('document.getElementById("collection-showHeader").click();document.getElementById("save").click()');await wait('!window.__SKThemeEditor.dirty');const savedHeader=await evaluate('window.__SKThemeEditor.state.global.collectionHeader.showHeader');await cdp('Page.reload');await wait('window.__SKThemeEditor');assert.equal(await evaluate('window.__SKThemeEditor.state.global.collectionHeader.showHeader'),savedHeader);results.push({page:'Theme catalog controls',browserSaveReload:true,publish:false});
    // The intermediate handset width is checked explicitly for header symmetry.
    await cdp('Emulation.setDeviceMetricsOverride',{width:430,height:850,deviceScaleFactor:1,mobile:true});await cdp('Page.navigate',{url:base+'/products-full.html'});await wait('window.__SKStorefrontCatalog?.rows.length===24&&document.querySelector(".sk-header")');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));results.push({page:'Header',width:430});
    const dir=require('node:path').join(process.cwd(),'storefront-review-evidence.local');fs.mkdirSync(dir,{recursive:true});const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(require('node:path').join(dir,'storefront-430.png'),Buffer.from(shot.data,'base64'));
    return results;
  }});
  fs.writeFileSync('storefront-review-result.local.json',JSON.stringify(result,null,2));console.log('Verified browser cases:',result.length);assert.equal(isolation.blockedEffects.length,0);
});
