'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkCheckoutReviewBrowser(base) {
  assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
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
    async function wait(expression){for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch{}await sleep(80);}throw Error('UI timeout: '+expression);}
    const evidence=path.join(process.cwd(),'checkout-review-evidence.local');fs.mkdirSync(evidence,{recursive:true});
    const capture=async name=>{const data=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(data.data,'base64'));};
    const initialMail=await fetch(base+'/review/state').then(r=>r.json()).then(d=>d.messages.length);
    let checks=0;
    for(const width of [1280,390,320]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<500});
      for(const kind of ['cash','link','english','missing','hostile']){
        await cdp('Page.navigate',{url:base+'/review/start/'+kind});await wait('location.pathname==="/checkout.html"&&document.getElementById("governorate").value!==""');
        assert.equal(await evaluate('document.getElementById("grandTotalValue").textContent'),'20.000 د.ك');
        assert.equal(await evaluate('document.getElementById("checkoutDiscountRow").hidden'),true);
        assert.equal(await evaluate('document.querySelector("input[name=payment]:checked").value'),kind==='link'?'link':'cash');
        assert.equal(await evaluate('Boolean(window.pwned)'),false);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
        await wait('[...document.querySelectorAll(".summary-thumb img")].every(i=>(i.hidden?getComputedStyle(i).display==="none":(i.complete&&i.naturalWidth>0)))');
        assert(await evaluate('[...document.querySelectorAll(".summary-name,.summary-price,#finalSummaryTotal")].every(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth+1)'),'Checkout card overflow '+width);
        if(width===390&&kind==='cash')await capture('checkout-mobile');checks++;
      }
      for(const kind of ['cash','link','discount','english','missing','hostile']){
        await cdp('Page.navigate',{url:base+'/review/thanks/'+kind});await wait('location.pathname==="/thank-you.html"&&!document.getElementById("orderSection").classList.contains("hide")');
        assert(await evaluate('document.getElementById("orderDate").textContent.includes("١٢:٤٠")'));
        assert.equal(await evaluate('document.getElementById("total").textContent'),kind==='discount'?'18.000 د.ك':'20.000 د.ك');
        assert.equal(await evaluate('document.getElementById("discountRow").style.display'),kind==='discount'?'flex':'none');
        assert.equal(await evaluate('document.getElementById("paymentMethod").textContent'),kind==='link'?'رابط دفع':'الدفع عند الاستلام');
        assert.equal(await evaluate('Boolean(window.pwned)'),false);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
        await wait('[...document.querySelectorAll(".item-image")].every(i=>i.complete&&i.naturalWidth>0)');
        if(width===390&&kind==='cash')await capture('thank-you-mobile');checks++;
        for(const audience of ['customer','admin']){
          await cdp('Page.navigate',{url:base+'/review/email/'+audience+'?case='+kind});await wait('document.readyState==="complete"');
          assert.equal(await evaluate('document.documentElement.dir'),audience==='admin'?'ltr':'rtl');
          assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Email overflow '+audience+' '+kind+' '+width);
          assert.equal(await evaluate('Boolean(window.pwned)'),false);
          assert(await evaluate('document.body.textContent.includes("12:40")||document.body.textContent.includes("١٢:٤٠")'));
          if(width===390&&kind==='cash')await capture('email-'+audience+'-mobile');checks++;
        }
      }
    }
    await cdp('Page.navigate',{url:base+'/review/start/cash'});await wait('location.pathname==="/checkout.html"&&document.getElementById("governorate").value!==""');
    await evaluate('document.getElementById("discountField").value="DEMO10";document.getElementById("discountBtn").click()');
    await wait('document.getElementById("grandTotalValue").textContent==="18.200 \u062f.\u0643"');
    assert.equal(await evaluate('document.getElementById("checkoutDiscountRow").hidden'),false);
    await evaluate('cart[0].quantity=2;resetDiscountState(true);applyDiscountCode(true)');
    assert.equal(await evaluate('document.getElementById("grandTotalValue").textContent'),'30.000 \u062f.\u0643');
    assert.equal(await evaluate('document.getElementById("shippingValue").textContent'),'\u0645\u062c\u0627\u0646\u064a');checks+=2;
    // Complete a real local checkout, exercising the actual API and captured mail transport.
    await cdp('Page.navigate',{url:base+'/review/start/cash'});await wait('location.pathname==="/checkout.html"&&document.getElementById("governorate").value!==""');
    await evaluate('document.getElementById("completeOrderBtn").click()');
    await wait('location.pathname==="/thank-you.html"&&!document.getElementById("orderSection").classList.contains("hide")');
    assert.equal(await evaluate('document.getElementById("total").textContent'),'20.000 د.ك');
    const mail=await evaluate('fetch("/review/state").then(r=>r.json())');assert.equal(mail.messages.length-initialMail,2);assert.equal(mail.externalEffects,0);
    for(const message of mail.messages.slice(initialMail)){await cdp('Page.navigate',{url:base+'/review/mail/'+message.id});await wait('document.readyState==="complete"');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));}
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({checks,viewports:[1280,390,320],localCheckoutTotal:20,capturedMessages:2,externalEffects:0,temporaryDatabase:true,nativeGmailAppleMailTested:false},null,2));
    console.log('PASS checkout review: '+checks+' viewport/scenario checks, actual local checkout and two captured mail messages.');
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkCheckoutReviewBrowser};
