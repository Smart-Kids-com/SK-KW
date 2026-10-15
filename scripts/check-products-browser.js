'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkProductsBrowser(base, options={}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-theme-browser-'));
  const executable = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  assert.ok(executable, 'A local Chrome/Edge browser is required');
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--no-default-browser-check', '--metrics-recording-only',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {
    windowsHide: true, stdio: ['ignore','ignore','pipe'],
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|APPDATA|LOCALAPPDATA)$/i.test(key)))
  });
  let socket;
  try {
    const endpoint = await new Promise((resolve,reject) => {
      let output=''; const timer=setTimeout(()=>reject(new Error('Browser startup timed out')),20000);
      browser.stderr.on('data',chunk=>{ output+=chunk; const match=output.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
        if(match){clearTimeout(timer);resolve(match[1]);} });
      browser.on('error',reject);
    });
    socket=new WebSocket(endpoint);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let sequence=0, blocked=0; const pending=new Map();
    function command(method,params={},sessionId){
      const id=++sequence;
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timed out'));},15000);
        pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
      });
    }
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.id){const callback=pending.get(message.id);if(!callback)return;clearTimeout(callback.timer);pending.delete(message.id);
        message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);
      }else if(message.method==='Fetch.requestPaused'){
        const local=message.params.request.url.startsWith(base+'/') || message.params.request.url.startsWith('data:');
        if(!local)blocked++;
        command(local?'Fetch.continueRequest':'Fetch.failRequest',{requestId:message.params.requestId,
          ...(!local?{errorReason:'BlockedByClient'}:{})},message.sessionId).catch(()=>{});
      }
    });
    const {targetId}=await command('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
    const cdp=(method,params)=>command(method,params,sessionId);
    await cdp('Page.enable');await cdp('Network.enable');await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    const evaluate=async expression=>{
      const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    async function wait(expression){for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch(e){if(!/context|navigated|closed/i.test(e.message))throw e;}await sleep(100);}throw new Error('UI did not reach '+expression);}
    await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
    for(const part of options.cookie.split('; ')){const i=part.indexOf('=');await cdp('Network.setCookie',{name:part.slice(0,i),value:part.slice(i+1),url:base});}
    const errors=[];await cdp('Runtime.enable');
    socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Page.javascriptDialogOpening')cdp('Page.handleJavaScriptDialog',{accept:true,promptText:m.params.type==='prompt'?(m.params.message.includes('slug')?'browser-page':'Browser theme'):undefined}).catch(()=>{});if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});

    if(options.dialogOnly){
      await cdp('Page.navigate',{url:base+'/products-admin'});await wait('window.__SKProductsList?.rows.length===25');
      assert(await evaluate(`(()=>{const index=[...document.querySelectorAll('#head th')].findIndex(n=>n.textContent==='Created'),td=document.querySelector('#rows tr').children[index];return td.textContent.length===10&&td.title.length>10;})()`));
      await evaluate(`(()=>{const s=document.getElementById('search');s.value='TEST-SKU-0003';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait('window.__SKProductsList.rows.length===1');await evaluate('document.querySelector("#rows input").click();document.getElementById("add-to-collection").click()');await wait('document.getElementById("collection-results").textContent==="132 of 132 collections"');
      assert(await evaluate('document.getElementById("collection-add").disabled'));
      const geometry=()=>evaluate(`(()=>{const d=document.getElementById('collection-dialog'),r=d.getBoundingClientRect(),h=d.querySelector('.collection-header').getBoundingClientRect(),f=d.querySelector('.collection-footer').getBoundingClientRect(),list=document.getElementById('collection-options');return r.width<=720&&r.height<=innerHeight*.85+1&&h.top>=r.top&&f.bottom<=r.bottom&&list.clientHeight>0&&d.scrollHeight<=d.clientHeight+2;})()`);
      assert(await geometry());const top=await evaluate('document.querySelector(".collection-header").getBoundingClientRect().top');await evaluate('document.getElementById("collection-options").scrollTop=200');assert.equal(await evaluate('document.querySelector(".collection-header").getBoundingClientRect().top'),top);assert.equal(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
      await evaluate('document.querySelector(".collection-choice span").click();document.querySelector(".collection-choice input:checked").focus()');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown'});assert.equal(await evaluate('document.querySelectorAll(".collection-choice input:checked").length'),1);assert.equal(await evaluate('document.querySelectorAll(".collection-choice.is-selected").length'),1);
      await evaluate(`(()=>{const s=document.getElementById('collection-search');s.value='مجموعة تجريبية 132';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.collection-choice span').click();})()`);assert.equal(await evaluate('document.getElementById("collection-results").textContent'),'1 of 132 collections');assert(await evaluate('document.getElementById("collection-confirm").textContent.includes("132")'));
      const evidence=path.join(process.cwd(),'products-editor-evidence.local');fs.mkdirSync(evidence,{recursive:true});
      for(const height of [640,400]){await cdp('Emulation.setDeviceMetricsOverride',{width:390,height,deviceScaleFactor:1,mobile:true});await sleep(100);assert(await geometry(),'Controls remain visible on small viewport');const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(evidence,'collection-dialog-'+height+'.png'),Buffer.from(shot.data,'base64'));}
      assert(await evaluate('document.getElementById("collection-options").clientHeight<100'),'Short filtered list leaves no large empty panel');assert(await evaluate('document.getElementById("collection-add").click();document.getElementById("collection-add").disabled'));await wait('document.getElementById("collection-status").textContent.includes("1 added; 0 already present")');assert(await geometry());assert(!await evaluate('document.getElementById("collection-add").disabled'));await evaluate('document.getElementById("collection-add").click()');await wait('document.getElementById("collection-status").textContent.includes("0 added; 1 already present")');await evaluate('document.querySelector(".collection-footer [data-close]").click()');await wait('!document.documentElement.classList.contains("collection-modal-open")');assert.deepEqual(errors,[]);console.log('PASS collection dialog polish: dates, scrolling, full-row/keyboard choice, search/count, fixed controls on small screens, disabled/add/result/cancel.');return;
    }
    if(options.collectionsOnly){
      await cdp('Page.navigate',{url:base+'/products-admin'});await wait('window.__SKProductsList?.rows.length===25');
      await evaluate(`(()=>{const s=document.getElementById('search');s.value='TEST-SKU-0003';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait('window.__SKProductsList.rows.length===1');await evaluate('document.querySelector("#rows input").click();document.getElementById("add-to-collection").click()');
      await wait('document.getElementById("collection-results").textContent.includes("132 collections")');
      await evaluate(`(()=>{const s=document.getElementById('collection-search');s.value='مجموعة تجريبية 132';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#collection-options input').click();})()`);
      assert(await evaluate('document.getElementById("collection-confirm").textContent.includes("1 selected products")'));await evaluate('document.getElementById("collection-add").click();document.getElementById("collection-add").click()');await wait('document.getElementById("collection-status").textContent.includes("0 added; 1 already present")');
      await cdp('Page.navigate',{url:base+'/collection-edit.html?id=132'});await wait('document.body?.textContent.includes("منتج تجريبي 3")');
      // Public API response and storefront rendering must exclude draft/archived products.
      await cdp('Network.clearBrowserCookies');await cdp('Page.navigate',{url:base+'/collection.html?slug=collection-demo-132'});await wait('document.body?.textContent.includes("منتج تجريبي 3")');assert(!await evaluate('document.body.textContent.includes("منتج تجريبي 4 باسم")'));assert.deepEqual(errors,[]);console.log('PASS collection browser: all admin choices, search/confirmation, repeated-click result, edit page membership and public storefront visibility.');return;
    }
    console.log('Products browser: list and server-side controls');
    await cdp('Page.navigate',{url:base+'/products-admin'});
    await wait('window.__SKProductsList?.rows.length===25');
    assert.equal(await evaluate('document.documentElement.dir'),'ltr');
    assert(await evaluate('document.querySelector(".product-cell a[dir=auto]")!==null'));
    const first=await evaluate('window.__SKProductsList.rows.map(p=>p.id)');
    await evaluate('document.getElementById("next").click()');
    await wait('document.getElementById("range").textContent.startsWith("26–50")');
    assert((await evaluate('window.__SKProductsList.rows.map(p=>p.id)')).every(id=>!first.includes(id)));
    const set=async(id,value,event='change')=>evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);
    await set('search','TEST-SKU-0230','input');await wait('window.__SKProductsList.rows.length===1&&window.__SKProductsList.rows[0].id===230');
    await set('search','definitely-no-product','input');await wait('window.__SKProductsList.total===0');assert(await evaluate('document.getElementById("rows").textContent.includes("No products match")'));
    await set('search','','input');await wait('window.__SKProductsList.rows.length===25');
    await evaluate(`(()=>{window.__originalProductsFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('/admin/list?')?Promise.resolve(new Response(JSON.stringify({success:false,error:'Simulated unavailable list'}),{status:503,headers:{'Content-Type':'application/json'}})):window.__originalProductsFetch(url,options);document.getElementById('refresh').click();})()`);
    await wait('document.getElementById("message").className==="error"&&document.getElementById("rows").textContent.includes("could not be loaded")');
    await evaluate('window.fetch=window.__originalProductsFetch;document.getElementById("refresh").click()');await wait('window.__SKProductsList.rows.length===25');
    await set('inventory','out_of_stock');await wait('window.__SKProductsList.rows.length>0&&window.__SKProductsList.rows.every(p=>p.available===0)');
    await set('inventory','');await set('category','تعليم');await wait('window.__SKProductsList.rows.length>0&&window.__SKProductsList.rows.every(p=>p.category==="تعليم")');
    await set('category','');await set('sort','price');await set('direction','ASC');await wait('window.__SKProductsList.rows.length===25&&window.__SKProductsList.rows.every((p,i,a)=>!i||p.price>=a[i-1].price)');
    console.log('Products browser: columns and independent preference persistence');
    await evaluate('document.getElementById("columns").click()');
    await evaluate('document.querySelector(".column-row[data-column=sku] input").click()');
    await evaluate('document.querySelector(".column-row[data-column=price] input").click()');
    await evaluate(`(()=>{const a=document.querySelector('.column-row[data-column=sku]'),b=document.querySelector('.column-row[data-column=status]'),transfer=new DataTransfer();a.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));b.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));})()`);
    assert.deepEqual((await evaluate('Array.from(document.querySelectorAll("#head th")).map(n=>n.textContent)')).slice(1,3),['Product','SKU']);
    await cdp('Page.reload');await wait('window.__SKProductsList?.rows.length===25');
    assert.deepEqual((await evaluate('Array.from(document.querySelectorAll("#head th")).map(n=>n.textContent)')).slice(1,3),['Product','SKU']);
    assert.equal(await evaluate('window.__SKProductsList.preferences.direction'),'ASC');
    await evaluate('document.getElementById("select-page").click()');
    assert(await evaluate('document.getElementById("selected-count").textContent==="25 selected"'));
    await set('bulk-status','draft');await evaluate('document.getElementById("apply-status").click()');await wait('document.getElementById("message").textContent.includes("25 updated to draft")');
    await evaluate('document.querySelector("[data-status=draft]").click()');await wait('window.__SKProductsList.rows.length>0&&window.__SKProductsList.rows.every(p=>p.status==="draft")');
    await evaluate('document.getElementById("export").click()');assert(await evaluate('document.getElementById("export-description").textContent.includes("across every page")'));
    await evaluate('window.__originalAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__downloadedProductsCSV=this.download;};document.getElementById("download-export").click()');await wait('window.__downloadedProductsCSV==="products-filtered.csv"');await evaluate('HTMLAnchorElement.prototype.click=window.__originalAnchorClick');
    console.log('Products browser: actual CSV file preview and application');
    const csvPath=path.join(profile,'products-import.csv');fs.writeFileSync(csvPath,'product_name,slug,sku,price,category,product_type,vendor\r\n"منتج استيراد عبر المتصفح",browser-import,BROWSER-IMPORT,5.125,ألعاب,Toy,Local demo\r\n');
    await evaluate('document.getElementById("import").click()');
    const doc=await cdp('DOM.getDocument');const input=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#import-file'});await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[csvPath]});
    await evaluate('document.getElementById("preview-import").click()');await wait('document.getElementById("import-status").textContent.includes("1 new")&&!document.getElementById("apply-import").disabled');
    assert(await evaluate('document.getElementById("import-status").textContent.includes("No changes applied")'));
    await evaluate('document.getElementById("apply-import").click()');await wait('document.getElementById("import-status").textContent.includes("1 created; 0 updated")');
    fs.writeFileSync(csvPath,'product_name,slug,sku,price\nOne,browser-dup-1,DUP-BROWSER,1\nTwo,browser-dup-2,DUP-BROWSER,2');
    await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[]});await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[csvPath]});await evaluate('document.getElementById("preview-import").click()');await wait('document.getElementById("import-status").textContent.includes("1 errors")');assert(await evaluate('document.getElementById("apply-import").disabled'));await evaluate('document.querySelector("[data-close=import-dialog]").click()');
    const evidence=path.join(process.cwd(),'products-editor-evidence.local');fs.mkdirSync(evidence,{recursive:true});
    for(const [name,width,mobile]of [['desktop',1600,false],['mobile',390,true]]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile});await sleep(200);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Page width fits device');assert(await evaluate('document.querySelector(".table-scroll").scrollWidth>=document.querySelector(".table-scroll").clientWidth'));if(mobile){assert(await evaluate('(()=>{const t=document.querySelector(".table-scroll");t.scrollLeft=150;const works=t.scrollLeft>0;t.scrollLeft=0;return works;})()'),'Horizontal scroll stays inside table');}const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(shot.data,'base64'));}
    assert.deepEqual(errors,[]);console.log('PASS Products browser: complete search/pagination/filter controls, column drag and reload, selected status scope, export scope, validated CSV application/rejection, desktop/mobile table.');
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkProductsBrowser};
