'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkAdminReadBrowser(base, options={}) {
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
    const report=[];
    const cases=[['Dashboard','/admin-enhanced','home',`document.getElementById('ordersValue')?.textContent===String(${options.counts.periodOrders})&&!state.summaryLoadFailed&&!state.loading`],['Products','/products-admin','products',`document.querySelectorAll('#rows tr[data-id]').length===25`],['Orders','/orders-admin.html','orders',`window.__SKOrdersList?.total===${options.counts.orders}&&document.querySelectorAll('#metrics .metric').length===6`],['Collections','/collections-admin','collections',`document.querySelectorAll('#rows input[type=checkbox]').length>0&&!document.getElementById('feedback').classList.contains('error')`],['Inventory','/inventory-admin.html','inventory',`document.querySelectorAll('#inventoryTableBody .row-select').length===${Math.min(30,options.counts.products)}`],['Customers','/customers-admin','customers',`document.querySelectorAll('#customersTableBody tr').length===${options.counts.customers}&&!document.getElementById('customersTableBody').textContent.includes('Loading')`],['Theme','/theme-admin','theme',`document.querySelectorAll('#draft-themes .theme-card').length>0&&document.querySelector('#published-theme .theme-card')`],['Theme editor','/theme-editor.html?theme=current','theme',`document.querySelectorAll('#tree .tree-row').length>0&&document.getElementById('save-state').textContent!=='Loading…'`],['Discounts','/discounts-admin','discounts',`document.querySelectorAll('#rows button[data-action=edit]').length>0&&document.getElementById('range').textContent.includes('of')`]];
    for(const width of [1280,390]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<500});
      for(const [name,path,page,ready]of cases){
        const start=Date.now();await cdp('Page.navigate',{url:base+path});if(name==='Dashboard'){await wait('document.readyState==="complete"&&typeof state!=="undefined"&&!state.loading');await evaluate("state.tempStart=new Date('2026-10-01T00:00:00Z');state.tempEnd=new Date('2026-10-31T23:59:59Z');document.getElementById('applyPickerBtn').click()")}await wait(ready);await wait('document.querySelector("[data-admin-navigation] .sk-nav-item[aria-current=page]")');
        assert.equal(await evaluate('document.body.dataset.adminPage'),page,name+' uses shared navigation');
        const ms=Date.now()-start;assert(ms<5000,name+' actual data rendered promptly');
        assert.equal(await evaluate(`document.querySelectorAll('[data-admin-navigation] .sk-nav-item[aria-current=page]').length`),1);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),name+' page fits '+width);
        if(width===1280){await evaluate('document.querySelector(".sk-nav-toggle").click()');assert(await evaluate('document.querySelector(".admin-layout").classList.contains("nav-collapsed")'));await evaluate('document.querySelector(".sk-nav-toggle").click()');assert(!(await evaluate('document.querySelector(".admin-layout").classList.contains("nav-collapsed")')))}
        else{await evaluate('document.querySelector(".sk-nav-details").open=true');assert(await evaluate('document.querySelector(".sk-nav-shell").getBoundingClientRect().width<innerWidth'));await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert(!(await evaluate('document.querySelector(".sk-nav-details").open')))}
        const resources=await evaluate(`performance.getEntriesByType('resource').filter(r=>r.name.includes('/api/')).map(r=>({path:new URL(r.name).pathname,ms:Math.round(r.duration),bytes:r.decodedBodySize})).filter(r=>!r.path.endsWith('/heartbeat'))`);
        report.push({name,width,ms,dataRendered:true,activePage:true,collapseOpenClose:true,requests:resources});
      }
    }
    return report;

  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkAdminReadBrowser};
