'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkOrdersBrowser(base, options={}) {
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


    await cdp('Page.navigate',{url:base+(options.collections?'/collections-admin':'/orders-admin.html')});await wait(options.collections?'window.__SKCollections?.rows.length>0':'window.__SKOrdersList?.rows.length===25');assert.equal(await evaluate('document.documentElement.dir'),'ltr');
    async function set(id,value,event='change'){await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));})()`);}
    if(options.collections){const helper=require('./check-collections-browser');await (options.ranking?helper.runRankingBrowser:options.captureOnly?helper.captureCollectionsDemo:options.front?helper.runCollectionsFront:helper.runCollectionsBrowser)({base,cdp,evaluate,wait,sleep,set,...(options.front||{}),...(options.ranking||{})});assert.deepEqual(errors,[]);return;}
    if(options.scrollOnly){await require('./orders-scroll-browser').checkOrdersScroll({cdp,evaluate,wait,sleep,baseline:options.baseline});assert.deepEqual(errors,[]);return;}
    if(options.appearanceOnly){
      assert.equal(await evaluate('Math.round(document.querySelector("[data-admin-navigation]").getBoundingClientRect().width)'),260);
      await evaluate('document.querySelector(".sk-nav-toggle").click()');assert(await evaluate('document.querySelector(".admin-layout").classList.contains("nav-collapsed")'));await evaluate('document.querySelector(".sk-nav-toggle").click()');
      await set('search','SK-DEMO-2','input');await wait('window.__SKOrdersList.rows.length===1');
      assert(await evaluate('document.querySelector(".order-customer").textContent.includes("<")'),'Unsafe text remains literal');assert.equal(await evaluate('document.querySelectorAll("#rows img,#rows script").length'),0);
      assert.equal(await evaluate('window.__demoXss===1'),false);
      await options.normalNames();await evaluate('document.getElementById("clear").click();document.getElementById("filters-toggle").click()');await wait('window.__SKOrdersList.rows.length===25');assert(await evaluate('!document.getElementById("advanced-filters").hidden'));
      await set('status','processing');await wait('window.__SKOrdersList.rows.length>0&&window.__SKOrdersList.rows.every(r=>r.status==="processing")');assert(await evaluate('document.getElementById("active-filters").textContent.includes("Fulfillment status")'));await evaluate('document.querySelector("#active-filters button").click()');await wait('window.__SKOrdersList.rows.length===25');await evaluate('document.getElementById("filters-toggle").click()');
      assert(await evaluate('document.querySelector(".metric-info summary").tabIndex===0||document.querySelector(".metric-info summary").tagName==="SUMMARY"'));await evaluate('document.querySelector(".metric-info summary").click()');assert(await evaluate('document.querySelector(".metric-info").open'));await evaluate('document.querySelector(".metric-info summary").click()');
      const evidence=path.join(process.cwd(),'orders-editor-evidence.local');fs.mkdirSync(evidence,{recursive:true});
      async function shot(name,full=false){const size=await cdp('Page.getLayoutMetrics');const clip=full?{x:0,y:0,width:size.cssContentSize.width,height:size.cssContentSize.height,scale:1}:undefined;const r=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:full,...(clip?{clip}:{})});fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(r.data,'base64'));}
      await shot('appearance-full',true);
      await evaluate('document.querySelectorAll("#rows input[type=checkbox]")[0].click();document.querySelectorAll("#rows input[type=checkbox]")[1].click()');assert.equal(await evaluate('document.getElementById("selected-count").textContent'),'2 selected');
      await evaluate('document.querySelector("#bulk-menu>summary").click()');assert(await evaluate('document.querySelectorAll("#bulk-menu h3").length===5'));await shot('appearance-selection');
      await evaluate('document.querySelector("[data-action=mark_paid]").click()');await wait('document.getElementById("action-dialog").open');assert(await evaluate('document.getElementById("action-warning").textContent.includes("no electronic capture")'));assert(await evaluate('document.getElementById("action-scope").textContent.startsWith("2 selected")'));await evaluate('document.querySelector("[data-close=action-dialog]").click()');
      await evaluate('document.querySelector("[data-mark=completed]").click()');await wait('document.getElementById("action-dialog").open');assert.equal(await evaluate('document.getElementById("action-title").textContent'),'Mark as Completed');await evaluate('document.querySelector("[data-close=action-dialog]").click()');
      const detail=await evaluate('document.querySelector(".order-link").href');await cdp('Page.navigate',{url:detail});await wait('document.body?.textContent.includes("عميل")');
      for(const page of ['/inventory-admin.html','/collections-admin','/customers-admin','/discounts-admin','/redirects-admin.html','/abandoned-checkouts-admin.html','/admin-enhanced','/theme-admin']){await cdp('Page.navigate',{url:base+page});await wait('document.readyState==="complete"');if(await evaluate('!!document.querySelector("[data-admin-navigation]")')){await wait('!!document.querySelector(".sk-nav-toggle")');assert.equal(await evaluate('Math.round(document.querySelector("[data-admin-navigation]").getBoundingClientRect().width)'),260);await evaluate('document.querySelector(".sk-nav-toggle").click()');assert(await evaluate('document.querySelector(".admin-layout").classList.contains("nav-collapsed")'));}}
      await cdp('Page.navigate',{url:base+'/orders-admin.html'});await wait('window.__SKOrdersList?.rows.length===25');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'));await evaluate('document.querySelector(".sk-nav-details summary").click()');assert(await evaluate('document.querySelector(".sk-nav-details").open'));await evaluate('document.querySelector(".sk-nav-details summary").click()');
      await evaluate('document.querySelectorAll("#rows input")[0].click();document.querySelector("#bulk-menu>summary").click()');assert(await evaluate('(()=>{const r=document.querySelector("#bulk-menu .menu-panel").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})()'));await shot('appearance-mobile');
      await evaluate('document.getElementById("bulk-menu").open=false;document.querySelector(".metric-info summary").focus()');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await wait('document.querySelector(".metric-info").open');assert(await evaluate('(()=>{const r=document.querySelector(".metric-info p").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()'));
      assert.deepEqual(errors,[]);console.log('PASS Orders appearance: shared 260px/collapsible navigation, filter chips, two-order direct reviews, literal unsafe text, details and 390px menus; no operation applied.');return;
    }
    await set('search','ORDER-DEMO-130','input');await wait('window.__SKOrdersList.rows.length===1&&window.__SKOrdersList.rows[0].id===130');await evaluate('document.getElementById("clear").click()');await wait('window.__SKOrdersList.rows.length===25');
    await evaluate('document.getElementById("columns").click();document.querySelector("[data-column=notes] input").click()');
    await evaluate(`(()=>{const a=document.querySelector('[data-column=total]'),b=document.querySelector('[data-column=date]'),dt=new DataTransfer();a.dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt}));b.dispatchEvent(new DragEvent('drop',{dataTransfer:dt}));})()`);await set('sort','total');await set('direction','ASC');await evaluate('document.querySelector("[data-close=columns-dialog]").click()');await cdp('Page.reload');await wait('window.__SKOrdersList?.rows.length===25');assert.equal(await evaluate('document.querySelectorAll("#head th")[2].textContent'),'Total');assert(await evaluate('window.__SKOrdersList.rows.every((r,i,a)=>!i||r.total>=a[i-1].total)'));
    await evaluate('document.getElementById("select-page").click();document.getElementById("next").click()');await wait('document.getElementById("range").textContent.startsWith("26–50")');assert(await evaluate('document.getElementById("selected-count").textContent.startsWith("25 selected")'));await evaluate('document.getElementById("select-page").click()');assert(await evaluate('document.getElementById("selected-count").textContent.startsWith("50 selected")'));
    await set('status','pending');await wait('window.__SKOrdersList.rows.every(r=>r.status==="pending")');assert(await evaluate('document.getElementById("selected-count").textContent.startsWith("0 selected")'));await evaluate('document.getElementById("select-filtered").click()');await wait('window.__SKOrdersList.scope?.ready');assert.equal(await evaluate('window.__SKOrdersList.scope.scope'),'filtered');await evaluate('document.getElementById("show-selected").click()');await wait('document.getElementById("message").textContent.includes("frozen selection")');
    await evaluate('document.getElementById("select-store").click()');await wait('window.__SKOrdersList.scope?.scope==="all"');assert((await evaluate('window.__SKOrdersList.scope.total'))>25);
    await evaluate('document.getElementById("action-apply").click()');await wait('document.getElementById("action-dialog").open');assert(await evaluate('document.getElementById("action-scope").textContent.includes("selected orders")'));await evaluate('document.getElementById("run-action").click()');await wait('!window.__SKOrdersList.busy&&document.getElementById("action-progress").textContent.includes("0 failed")&&document.getElementById("message").textContent.includes("completed")');await evaluate('document.querySelector("[data-close=action-dialog]").click()');
    await evaluate('window.open=url=>{window.__printURL=url;return null;};document.getElementById("print-selected").click()');await wait('window.__printURL');assert(await evaluate('fetch(window.__printURL).then(r=>r.text()).then(t=>t.includes("Print this batch")&&t.includes("KWD"))'));
    await evaluate('document.getElementById("export").click()');await evaluate('HTMLAnchorElement.prototype.click=function(){window.__exportURL=this.href;};document.getElementById("download-export").click()');await wait('window.__exportURL');assert(await evaluate('fetch(window.__exportURL).then(r=>r.text()).then(t=>t.includes("ORDER-DEMO-130"))'));
    await evaluate('document.getElementById("create").click()');await set('create-search','كتاب','input');await wait('document.querySelector("#create-products button")');await evaluate('document.querySelector("#create-products button").click()');
    await evaluate(`(()=>{const values={customerName:'عميل متصفح',customerEmail:'browser@example.invalid',customerPhone:'99999999',customerAddress:'عنوان تجريبي'};for(const [k,v]of Object.entries(values))document.querySelector('[name="'+k+'"]').value=v;document.getElementById('create-form').requestSubmit();})()`);await wait('document.getElementById("create-result").textContent.includes("Order created")');assert(await evaluate('document.getElementById("create-result").textContent.includes("No email/Meta")'));await evaluate('document.querySelector("[data-close=create-dialog]").click()');
    const evidence=path.join(process.cwd(),'orders-editor-evidence.local');fs.mkdirSync(evidence,{recursive:true});for(const [name,width,mobile]of [['desktop',1600,false],['mobile',390,true]]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile});await sleep(100);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'No page-wide overflow');assert(await evaluate('(()=>{const t=document.querySelector(".table-scroll");t.scrollLeft=100;return t.scrollWidth<=t.clientWidth||t.scrollLeft>0;})()'));const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(shot.data,'base64'));}
    assert.deepEqual(errors,[]);console.log('PASS Orders browser: search/sort/column persistence, explicit/filtered/store selection, jobs, native CSV/print paths, admin creation and mobile scrolling.');
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkOrdersBrowser};
