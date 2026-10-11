'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkOrderBrowser(base, db, options={}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-checkout-browser-'));
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
    async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('UI did not reach '+expression);}
    if(options.unsupportedActions){
      for(const part of options.cookie.split('; ')){
        const index=part.indexOf('=');await cdp('Network.setCookie',{name:part.slice(0,index),value:part.slice(index+1),url:base});
      }
      await cdp('Page.navigate',{url:base+'/order-details.html?id='+options.orderId});
      await wait('typeof currentOrder!=="undefined" && currentOrder?.id');
      await evaluate('openMainOrderEdit()');
      assert.equal(await evaluate('document.querySelector("#mainEditStatus option[value=on_hold]").disabled'),true);
      await evaluate(`document.getElementById('mainEditStatus').value='processing';document.getElementById('mainEditShippingCost').value='3';document.getElementById('mainOrderEditForm').requestSubmit()`);
      await wait('currentOrder.status==="processing" && currentOrder.shipping_cost===3');
      assert.equal((await db.get('SELECT total FROM orders WHERE id=?',[options.orderId])).total,13);
      await cdp('Page.navigate',{url:base+'/orders-admin.html'});
      await wait('document.getElementById("desktopCaptureBtn") && typeof bulkUpdateStatus==="function"');
      assert.equal(await evaluate('document.getElementById("desktopCaptureBtn").disabled && document.getElementById("mobileCaptureBtn").disabled'),true);
      assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).filter(x=>x.textContent==="On hold (not supported)" && x.disabled).length'),2);
      return;
    }
    if(options.invoice){
      for(const part of options.cookie.split('; ')){
        const index=part.indexOf('=');await cdp('Network.setCookie',{name:part.slice(0,index),value:part.slice(index+1),url:base});
      }
      await cdp('Page.navigate',{url:base+'/order-details.html?id='+options.orderId});
      await wait('typeof currentOrder!=="undefined" && currentOrder?.id && document.getElementById("invoiceStatusPanel")');
      const click="document.querySelector('button[onclick=\"sendInvoice()\"]').click()";
      const count=options.sent.length;
      await evaluate(click);await wait('invoiceState?.state==="sent"');assert.equal(options.sent.length,count+1);
      await evaluate(`openMainOrderEdit();document.querySelector('.main-edit-qty').value='3';document.getElementById('mainEditShippingCost').value='4';recalculateMainEditTotals();document.querySelector('#mainOrderEditModal form').requestSubmit()`);
      try{await wait('currentOrder.items[0].quantity===3 && currentOrder.shipping_cost===4');}
      catch(error){throw new Error(error.message+JSON.stringify(await evaluate('({items:currentOrder.items,shipping:currentOrder.shipping_cost,alerts:Array.from(document.querySelectorAll(".alert")).map(x=>x.textContent),invalid:Array.from(document.querySelectorAll("#mainOrderEditForm :invalid")).map(x=>({id:x.id,message:x.validationMessage}))})')));}
      await evaluate(`openQuickEdit('shipping');document.getElementById('quickEditAddress').value='Updated browser street';document.getElementById('quickEditCity').value='Updated city';document.getElementById('quickEditDistrict').value='Updated district';document.getElementById('quickEditForm').requestSubmit()`);
      await wait('currentOrder.customer_address==="Updated browser street"');
      await evaluate(`openQuickEdit('contact');document.getElementById('quickEditName').value='Updated browser customer';document.getElementById('quickEditEmail').value='browser-updated@example.invalid';document.getElementById('quickEditPhone').value='98888888';document.getElementById('quickEditForm').requestSubmit()`);
      await wait('currentOrder.customer_name==="Updated browser customer"');
      await evaluate('refreshInvoiceStatus()');assert.equal(await evaluate('invoiceState.state'),'not_sent');
      await evaluate(click+';'+click+';'+click);await wait('invoiceState?.state==="sent"');
      assert.equal(options.sent.length,count+2);
      const message=options.sent.at(-1).message;
      assert.equal(message.to,'browser-updated@example.invalid');
      for(const text of ['Updated browser customer','Updated browser street','Updated city','Updated district','98888888','19.000 KWD'])assert.ok(message.html.includes(text),text);
      assert.match(message.html,/>\s*3\s*</);
      await evaluate('sendInvoice()');assert.equal(options.sent.length,count+2);
      assert.ok((await evaluate('document.getElementById("invoiceStatusPanel").textContent')).includes('سبق إرسالها'));
      assert.ok((await evaluate('document.getElementById("mobileInvoiceStatusPanel").textContent')).includes('سبق إرسالها'));
      await db.run("INSERT INTO order_invoice_jobs(order_id,state,provider_id) VALUES(?,'sent','browser-legacy')",[options.orderId]);
      await evaluate('refreshInvoiceStatus()');assert.equal(await evaluate('invoiceState.state'),'legacy_review');
      await evaluate(`window.confirm=()=>true;document.querySelector('#invoiceStatusPanel button[data-invoice-decision="already_sent"]').click()`);
      await wait('invoiceState.state==="sent"');await evaluate('sendInvoice()');assert.equal(options.sent.length,count+2);
      await evaluate(`openQuickEdit('contact');document.getElementById('quickEditName').value='After legacy browser review';document.getElementById('quickEditForm').requestSubmit()`);
      await wait('currentOrder.customer_name==="After legacy browser review"');
      await evaluate('sendInvoice()');assert.equal(options.sent.length,count+3);
      assert.match(options.sent.at(-1).message.html,/After legacy browser review/);
      return;
    }
    if(options.catalog){
      await cdp('Page.navigate',{url:base+'/products-full.html'});
      await wait('typeof allProducts!=="undefined" && allProducts.length>200');
      assert.equal(await evaluate('allProducts.some(product=>Number(product.id)===10)'),true);
      assert.equal(await evaluate('allProducts.some(product=>product.status!=="active")'),false);
    }
    await cdp('Page.navigate',{url:base+'/product-page.html?id=1'});
    await wait('document.querySelector("#pPrice")?.textContent.includes("5.000") && !document.querySelector("#addToCartBtn").disabled');
    await evaluate('document.querySelector("#qtyPlus").click(); document.querySelector("#addToCartBtn").click();');
    await wait('JSON.parse(localStorage.getItem("cart")||"[]")[0]?.quantity===2');
    await cdp('Page.navigate',{url:base+'/cart.html'});
    await wait('!!document.querySelector("#checkoutBtn") && !!document.querySelector(".cart-title")');
    await evaluate('document.querySelector("#checkoutBtn").click()');
    await wait('location.pathname==="/checkout.html" && !!document.querySelector("#completeOrderBtn")');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("input[id],select[id],textarea[id]")).filter(input=>!input.getAttribute("aria-label") && !input.labels?.length).length'),0);
    await evaluate('document.querySelector("#summaryToggle").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
    assert.equal(await evaluate('document.querySelector("#summaryToggle").getAttribute("aria-expanded")'),'false');
    await evaluate('document.querySelector("#summaryToggle").dispatchEvent(new KeyboardEvent("keydown",{key:" ",bubbles:true}))');
    await evaluate(`Object.entries({contactField:'browser-order@example.invalid',firstName:'Browser',lastName:'Synthetic',
      address1:'Synthetic address',city:'Synthetic city',phone:'99999999',governorate:'العاصمة',discountField:'DEMO10'})
      .forEach(([id,value])=>{const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
      document.querySelector('#discountBtn').click();`);
    await evaluate(`document.querySelector('input[name=billingAddress][value=different]').closest('label').click();
      Object.entries({billingFirstName:'Invoice',billingLastName:'Synthetic',billingAddress1:'Different billing address',
        billingCity:'Billing city',billingGovernorate:'حولي',billingPhone:'99999999'}).forEach(([id,value])=>{
        const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));});`);
    await wait('document.querySelector("#finalSummaryTotal").textContent.includes("11.000")');
    const evidence=fs.mkdtempSync(path.join(os.tmpdir(),'sk-checkout-evidence-'));
    const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(evidence,'checkout-before-submit.png'),Buffer.from(screenshot.data,'base64'));
    await evaluate('document.querySelector("#completeOrderBtn").click()');
    await wait('location.pathname==="/thank-you.html" && !!localStorage.getItem("last_order")');
    const saved=await evaluate('JSON.parse(localStorage.getItem("last_order"))');
    const row=await db.get('SELECT * FROM orders WHERE id=?',[saved.id]);
    for(const [key,value] of Object.entries({subtotal:10,discount_amount:1,shipping_cost:2,total:11,inventory_managed:1})) {
      assert.equal(row[key],value,key);assert.equal(saved[key],value,'browser '+key);
    }
    const item=await db.get('SELECT * FROM order_items WHERE order_id=?',[saved.id]);
    assert.equal(item.price,5);assert.equal(item.quantity,2);
    assert.equal(row.billing_mode,'different');
    assert.equal(JSON.parse(row.billing_address).address1,'Different billing address');
    assert.ok(row.abandoned_checkout_token);
    const abandoned=await db.get('SELECT * FROM abandoned_checkouts WHERE checkout_token=?',[row.abandoned_checkout_token]);
    assert.equal(abandoned.status,'recovered');assert.equal(String(abandoned.recovered_order_id),String(row.id));
    assert.deepEqual({...await db.get('SELECT on_hand,committed,stock FROM products WHERE id=1')}, {on_hand:100,committed:2,stock:98});
    assert.equal((await db.get('SELECT state FROM order_inventory WHERE order_id=?',[saved.id])).state,'reserved');
    const end=await cdp('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(evidence,'thank-you.png'),Buffer.from(end.data,'base64'));
    console.log(`PASS browser: product -> cart -> discount/shipping -> checkout -> thank-you; saved total 11 KWD, reserved 2, available 98. Evidence: ${evidence}. External requests blocked: ${blocked}.`);
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-checkout-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkOrderBrowser};
