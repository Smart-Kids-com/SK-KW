'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkDiscountsBrowser(base, options={}) {
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
﻿    async function wait(expression){for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{}await sleep(80);}throw Error('Browser condition timed out: '+expression);}

    for(const entry of options.cookie.split('; ')){const [name,...value]=entry.split('=');await cdp('Network.setCookie',{name,value:value.join('='),url:base,path:'/'})}
    await cdp('Page.navigate',{url:base+'/discounts-admin'});await wait('document.getElementById("rows").textContent.includes("PAGE-")');
    assert.equal(await evaluate('document.documentElement.dir'),'ltr');

    async function touchScroll(point,direction){
      await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
      for(let n=1;n<=8;n++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y+direction*n*18}]});await sleep(25)}
      await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    async function scrollChecks(width){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:width<500});
      await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      for(const selector of ['.table-scroll','.filters','main']){
        for(const device of ['wheel','trackpad','touch']){
          await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'});window.scrollBy(0,-100)`);await sleep(80);
          const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.min(innerWidth-25,Math.max(25,r.left+r.width/2)),y:Math.min(innerHeight-90,Math.max(110,r.top+Math.min(r.height/2,200)))}})()`);
          const before=await evaluate('scrollY');
          if(device==='touch')await touchScroll(point,-1);
          else await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:device==='trackpad'?180.5:220});
          await sleep(400);const down=await evaluate('scrollY');assert(down>before+20,`Scroll down ${width} ${selector} ${device}: ${before} -> ${down}`);
          if(device==='touch')await touchScroll(point,1);
          else await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:-150});
          await sleep(400);assert((await evaluate('scrollY'))<down-15,`Scroll up ${width} ${selector} ${device}`);
        }
      }
      await evaluate('scrollTo(0,0);document.getElementById("create").click()');await wait('document.getElementById("editor").open');
      assert.equal(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
      const initial=await evaluate('scrollY');await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:5,y:350,deltaX:0,deltaY:250});await sleep(200);assert.equal(await evaluate('scrollY'),initial);
      const formPoint=await evaluate(`(()=>{const r=document.getElementById('form').getBoundingClientRect();return {x:Math.min(innerWidth-40,Math.max(40,r.x+r.width/2)),y:Math.min(innerHeight-80,Math.max(120,r.top+180))}})()`);
      await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',...formPoint,deltaX:0,deltaY:300});await sleep(200);assert((await evaluate('document.getElementById("editor").scrollTop'))>0,'Form dialog scrolls');
      await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait('!document.getElementById("editor").open');assert.notEqual(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
      await evaluate('document.getElementById("create").click();document.querySelector("#editor [data-close]").click()');assert.notEqual(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
      await evaluate('document.getElementById("columns").click();document.getElementById("columns-dialog").close()');assert.notEqual(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
      assert.equal(await evaluate('document.querySelector(".table-scroll").scrollHeight>document.querySelector(".table-scroll").clientHeight'),false);
      if(width===390){await evaluate('document.querySelector(".table-scroll").scrollIntoView();document.querySelector(".table-scroll").scrollLeft=0');await cdp('Input.dispatchMouseEvent',{type:'mouseWheel',x:180,y:320,deltaX:260,deltaY:0});await sleep(250);assert((await evaluate('document.querySelector(".table-scroll").scrollLeft'))>0,'Horizontal table scroll retained')}
      await evaluate('scrollTo(0,0)');
    }
    for(const width of [1280,390])await scrollChecks(width);
    console.log('PASS Discounts scroll: wheel, precise wheel/trackpad and touch gestures over table/filters/content; modal form scrolling, backdrop lock, Escape/button/programmatic unlock; horizontal table retained. No collapsible sidebar exists.');
    await evaluate('document.getElementById("create").click()');await wait('document.getElementById("editor").open');
    await evaluate(`document.getElementById('code').value='BROWSER';document.getElementById('title').value='<img src=x onerror="window.pwned=1"> خصم';document.getElementById('value').value=25;document.getElementById('form').requestSubmit()`);
    await wait('!document.getElementById("editor").open');await wait('document.getElementById("rows").textContent.includes("BROWSER")');
    assert.equal(await evaluate('Boolean(window.pwned)'),false);assert.equal(await evaluate('document.querySelectorAll("#rows img").length'),0);
    await evaluate(`document.querySelector('[data-action=edit]').click()`);await wait('document.getElementById("editor").open');assert.equal(await evaluate('document.getElementById("code").value'),'BROWSER');
    await evaluate(`document.getElementById('scope').value='products';document.getElementById('scope').dispatchEvent(new Event('change'))`);await wait('document.querySelectorAll("#targets input").length>0');
    await evaluate(`document.querySelector('#targets input[value="1"]').click();document.getElementById('form').requestSubmit()`);await wait('!document.getElementById("editor").open');
    await evaluate('document.getElementById("columns").click()');await wait('document.getElementById("columns-dialog").open');await evaluate('document.querySelector("[data-column=notes]").click();document.getElementById("columns-dialog").close()');await cdp('Page.reload');await wait('document.getElementById("rows").textContent.includes("BROWSER")');assert(!(await evaluate('document.getElementById("head").textContent')).includes('Notes'));
    for(const width of [1280,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Discount list overflow '+width);
      await evaluate('document.getElementById("create").click()');await wait('document.getElementById("editor").open');assert(await evaluate('document.getElementById("editor").getBoundingClientRect().width<=innerWidth'),'Editor overflow');await evaluate('document.getElementById("editor").close()');
    }
    await cdp('Page.navigate',{url:base+'/order-details.html?id='+options.orderId});await wait('document.getElementById("desktopDiscountAmount").textContent.includes("3.000")');assert(await evaluate('document.getElementById("desktopDiscountLabel").textContent.includes("خصم محدود")'));assert(await evaluate('document.getElementById("mobileDiscountAmount").textContent.includes("3.000")'));
    await evaluate(`localStorage.setItem('cart',JSON.stringify([{id:1,name:'منتج عربي',price:10,quantity:1,image:'/sk-main-logo.webp'}]));localStorage.setItem('cart_discount_code','BROWSER')`);
    await cdp('Page.navigate',{url:base+'/checkout.html'});await wait('document.getElementById("discountValue").textContent.includes("2.500")');assert.equal(await evaluate('document.documentElement.dir'),'rtl');assert.equal(await evaluate('Boolean(window.pwned)'),false);assert.equal(await evaluate('document.querySelectorAll("#discountLabel img").length'),0);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    await cdp('Page.navigate',{url:base+'/cart.html'});await wait('document.getElementById("cartDiscountResult").textContent.includes("2.500")');assert.equal(await evaluate('Boolean(window.pwned)'),false);
    const fixture={id:1,order_number:'LOCAL-DISCOUNTS',customer_name:'عميل محلي',customer_address:'عنوان',discount_label:'<img src=x onerror="window.pwned=1"> خصم',discount_code:'BROWSER',subtotal:10,shipping_cost:2,discount_amount:2.5,total:9.5,created_at:'2026-10-22 09:00:00',items:[{product_id:1,product_name:'منتج',quantity:1,price:10}]};
    await evaluate('localStorage.setItem("last_order",'+JSON.stringify(JSON.stringify(fixture))+')');await cdp('Page.navigate',{url:base+'/thank-you.html?order=LOCAL-DISCOUNTS'});await wait('document.getElementById("discount").textContent.includes("2.500")');assert.equal(await evaluate('Boolean(window.pwned)'),false);assert.equal(await evaluate('document.querySelectorAll("#discountLabel img").length'),0);
    console.log('PASS Discounts browser: create/edit targeting, saved columns, 1280/390/320, Cart/Checkout/Thank-you RTL and escaped labels.');

  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkDiscountsBrowser};
