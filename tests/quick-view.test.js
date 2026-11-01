'use strict';
const isolation=require('./security-support');
const {test}=require('node:test'),assert=require('node:assert/strict');
test('Quick View touch, quantity, safe content and dismissal on product and collection catalogs',async()=>{
 const db=await require('../scripts/security-demo-fixtures').seedSecurityDemo();
 await require('../db/collections-editor-migration').migrateCollectionsEditor(db);
 await require('../db/collection-ranking-migration').migrateCollectionRanking(db);
 const name='كتاب تجريبي بعنوان كامل <img src=x onerror="window.__xss=1">';
 await db.run('UPDATE products SET status=?,product_name=?,sale_price=?,description=? WHERE id=1',['active',name,4,'وصف مختصر <b>آمن</b>']);
 await db.run('UPDATE collections SET status=? WHERE id=1',['active']);
 const before=await db.all('SELECT id,stock,on_hand,committed FROM products ORDER BY id');
 const wrapper=require('express')();
 wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send(''));
 const server=wrapper.listen(0,'127.0.0.1');await require('node:events').once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;
 const app=require('../server');wrapper.use(app);
 try{
  const report=await require('../scripts/check-admin-read-browser').checkAdminReadBrowser(base,{run:async({cdp,evaluate,wait})=>{
   const out=[];
   async function tap(selector){
    await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center"})');
    const p=await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   for(const width of [1280,390,320])for(const page of ['/products-full.html','/collection.html?id=1']){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await cdp('Page.navigate',{url:base+page});await wait('document.querySelector(".sk-card-view")');
    await evaluate('localStorage.setItem("cart","[]")');
    const url=await evaluate('location.href'),overflow=await evaluate('document.body.style.overflow');
    await tap('.sk-card-view');await wait('document.querySelector(".sk-quick-add")');
    assert.equal(await evaluate('location.href'),url);assert.equal(await evaluate('document.body.style.overflow'),'hidden');
    assert.equal(await evaluate('document.querySelector("#sk-quick-title").textContent'),name);
    assert.equal(await evaluate('!!window.__xss'),false);assert.equal(await evaluate('document.querySelectorAll("#sk-quick-title img").length'),0);
    await wait('document.querySelector(".sk-quick-image img").naturalWidth>0');
    assert.equal(await evaluate('document.querySelector(".sk-quick-price strong").textContent'),'4.000 د.ك');
    assert.equal(await evaluate('document.querySelector(".sk-quick-price del").textContent'),'5.000 د.ك');
    assert(await evaluate('(()=>{const r=document.querySelector("dialog").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'));
    assert.equal(await evaluate('new URL(document.querySelector(".sk-quick-full").href).pathname'),'/product-page.html');
    await evaluate('document.querySelector("#sk-quick-quantity").value="2"');await tap('.sk-quick-add');await wait('JSON.parse(localStorage.getItem("cart"))[0]?.quantity===2');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("cart"))[0].price'),4);
    await tap('.sk-quick-close');await wait('!document.querySelector("dialog")');assert.equal(await evaluate('document.body.style.overflow'),overflow);
    await tap('.sk-card-view');await wait('document.querySelector(".sk-quick-add")');
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait('!document.querySelector("dialog")');
    await tap('.sk-card-view');await wait('document.querySelector(".sk-quick-add")');
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:2,y:2}]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait('!document.querySelector("dialog")');
    assert.equal(await evaluate('document.body.style.overflow'),overflow);out.push({width,page,touch:true,quantity:2,closeEscapeBackdrop:true});
   }return out;
  }});console.log(JSON.stringify(report));
  assert.deepEqual(await db.all('SELECT id,stock,on_hand,committed FROM products ORDER BY id'),before);
  assert.equal(isolation.blockedEffects.length,0);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));app.locals.adminAuth.close();(await db.ensureTursoClient()).close();}
});
