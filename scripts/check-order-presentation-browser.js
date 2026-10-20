'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkOrderPresentationBrowser(base, options={}) {
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
    await cdp('Page.navigate',{url:base+'/thank-you.html?order=SYNTHETIC'});
    await wait('document.getElementById("alert").classList.contains("active")');
    assert(await evaluate('document.getElementById("orderSection").classList.contains("hide")'));
    const fixture=options.order;
    await evaluate('localStorage.setItem("last_order",'+JSON.stringify(JSON.stringify(fixture))+');window.SmartKidsPixel={trackPurchase:o=>{window.purchaseCalls=(window.purchaseCalls||[]).concat(o)}};loadOrderDetails()');
    await wait('!document.getElementById("orderSection").classList.contains("hide")');
    assert.equal(await evaluate('window.purchaseCalls.length'),1);
    assert.equal(await evaluate('window.purchaseCalls[0].eventId'),'purchase_'+fixture.order_number);
    assert.equal(await evaluate('window.purchaseCalls[0].value'),fixture.total);
    await evaluate('loadOrderDetails()');assert.equal(await evaluate('window.purchaseCalls.length'),1);
    assert.equal(await evaluate('document.querySelectorAll(".item").length'),2);
    assert.equal(await evaluate('Boolean(window.pwned)'),false);
    assert.equal(await evaluate('document.querySelectorAll(".item-name img,.item-name svg").length'),0);
    assert(await evaluate('document.getElementById("orderDate").textContent.includes("١٢:٤٠")'));
    assert(await evaluate('document.getElementById("total").textContent.endsWith("د.ك")'));
    assert.equal(await evaluate('document.getElementById("discountRow").style.display'),'none');
    assert(!(await evaluate('decodeURIComponent(document.getElementById("whatsappBtn").href)')).includes(fixture.customer_name));
    for(const width of [1280,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});
      await cdp('Page.navigate',{url:base+'/thank-you.html?order=SYNTHETIC'});await wait('!document.getElementById("orderSection").classList.contains("hide")');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Thank-you overflow '+width);
      for(const path of ['/qa-mail-customer','/qa-mail-admin']){
        await cdp('Page.navigate',{url:base+path});await wait('document.readyState==="complete"');
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Email overflow '+path+' '+width);
        assert.equal(await evaluate('Boolean(window.pwned)'),false);
      }
    }
    await cdp('Page.navigate',{url:base+'/thank-you.html'});await wait('document.readyState==="complete"');await evaluate('localStorage.clear();sessionStorage.clear()');await cdp('Page.reload');await wait('document.getElementById("alert").classList.contains("active")');
    assert(await evaluate('document.getElementById("orderSection").classList.contains("hide")'));
    console.log('PASS isolated browser: clean session, safe names, Kuwait time, repeat-safe Pixel mock, 1280/390/320 layouts and mail previews.');
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkOrderPresentationBrowser};
