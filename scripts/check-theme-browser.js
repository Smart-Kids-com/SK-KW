'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkThemeBrowser(base, options={}) {
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
    console.log('Theme UX: management');
    await cdp('Page.navigate',{url:base+'/theme-admin'});await wait('document.querySelector("#published-theme .theme-card")');
    if(process.env.THEME_UX_POLISH==='1'){
      await sleep(200);
      assert(await evaluate(`(()=>{const p=document.querySelector('.theme-card-preview'),f=p.querySelector('iframe'),a=p.getBoundingClientRect(),b=f.getBoundingClientRect();return Math.abs(a.width-b.width)<2&&Math.abs(a.height-b.height)<2;})()`),'Thumbnail fills its container without unintended crop');
      await evaluate('document.querySelector("#published-theme button").click()');
      await wait('window.__SKThemeEditor?.tree.some(n=>n.name==="Product slideshow")');
      await wait('document.getElementById("preview").contentDocument.querySelector(".hero-btn:not(:disabled)")');
      const names=await evaluate('window.__SKThemeEditor.tree.map(n=>n.name)');
      for(const name of ['Logo','Search','Cart','Menu'])assert(names.includes(name),name+' semantic block');
      assert.equal(await evaluate('window.__SKThemeEditor.tree.find(n=>n.key==="#headerSearchBtn").name'),'Search');
      assert(names.some(n=>['Instagram','Facebook','WhatsApp','YouTube','TikTok','Snapchat'].includes(n)),'Social platform names');
      await evaluate(`(()=>{const n=window.__SKThemeEditor.tree.find(n=>n.name==='Product slideshow');window.__SKThemeEditor.select({key:n.key,scope:n.scope});document.querySelector('.tree-row[data-node="'+n.key+'"] + details').open=true;})()`);
      assert.equal(await evaluate('document.getElementById("setting-buttonText").value'),await evaluate('document.getElementById("preview").contentDocument.querySelector(".hero-btn:not(:disabled)").textContent'));
      assert(await evaluate('document.getElementById("setting-buttonText").closest("label").textContent.includes("Add to cart button text")'));
      assert(await evaluate(`(()=>{const n=window.__SKThemeEditor.tree.find(n=>n.name==='Product slideshow'),row=document.querySelector('.tree-row[data-node="'+n.key+'"]');return !row.querySelector('.move')&&row.querySelectorAll('.row-menu').length===1&&getComputedStyle(row.querySelector('button')).whiteSpace==='normal';})()`));
      assert(names.some(n=>n.startsWith('Product image — ')),'Slide blocks carry current product names');
      await evaluate(`(()=>{const input=document.getElementById('setting-buttonText');input.value='Cart action test';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await wait('document.getElementById("preview").contentDocument.querySelector(".hero-btn:not(:disabled)").textContent==="Cart action test"');
      assert(await evaluate('document.getElementById("preview").contentDocument.querySelector(".hero-btn:not(:disabled)").hasAttribute("data-add-id")'));
      await evaluate(`(()=>{const d=document.getElementById('preview').contentDocument,clone=d.querySelector('.hero-slide').cloneNode(true);clone.dataset.themeMotionClone='1';clone.id='test-motion-clone';d.getElementById('heroTrack').append(clone);document.getElementById('desktop').click();})()`);
      await sleep(300);
      assert(!await evaluate('window.__SKThemeEditor.tree.some(n=>n.key.includes("test-motion-clone"))'),'Motion clone excluded');
      assert.deepEqual(errors,[]);console.log('PASS focused Theme UI: fitted thumbnail, semantic names, full titles, compact actions, product block names, clone exclusion, cart button text/binding.');return;
    }
    assert.equal(await evaluate('document.documentElement.dir'),'ltr');
    const count=await evaluate('document.querySelectorAll("#draft-themes .theme-card").length');
    await evaluate('document.querySelector("#published-theme details summary").click()');
    await evaluate('Array.from(document.querySelectorAll("#published-theme button")).find(b=>b.textContent==="Duplicate").click()');
    await wait(`document.querySelectorAll('#draft-themes .theme-card').length===${count+1}`);
    const themeId=await evaluate('Array.from(document.querySelectorAll("#draft-themes .theme-card")).find(c=>c.querySelector("h2").textContent==="Browser theme").dataset.theme');
    await evaluate('Array.from(document.querySelectorAll("#draft-themes .theme-card")).find(c=>c.querySelector("h2").textContent==="Browser theme").querySelector("button").click()');
    await wait('window.__SKThemeEditor && window.__SKThemeEditor.tree.some(n=>n.sectionRoot)');
    assert.equal(await evaluate('document.documentElement.lang'),'en');
    assert.equal(await evaluate('document.getElementById("preview").contentDocument.documentElement.dir'),'rtl');
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".tree-group-title")).map(n=>n.firstChild.textContent)'),['Header','Template','Footer']);
    assert(!await evaluate('Array.from(document.querySelectorAll(".tree-row>button:first-of-type")).some(b=>/^(div|main|section)$/.test(b.textContent))'));
    const publishedBefore=await evaluate('fetch("/api/theme/published").then(r=>r.json()).then(d=>JSON.stringify(d.data.document))');
    await evaluate('document.getElementById("preview").contentDocument.querySelector(".sk-announcement-bar span").click()');await wait('document.getElementById("element-text")');
    await evaluate('const input=document.getElementById("element-text");input.value="محتوى عربي محفوظ";input.dispatchEvent(new Event("input"))');
    await wait('document.getElementById("preview").contentDocument.querySelector(".sk-announcement-bar").textContent.includes("محتوى عربي محفوظ")');
    const nativeHero=await evaluate('window.__SKThemeEditor.tree.find(n=>n.name==="Product slideshow"&&n.sectionRoot).key');
    await evaluate(`window.__SKThemeEditor.select({key:${JSON.stringify(nativeHero)},scope:'page'})`);
    await wait('document.getElementById("setting-arrows")');
    await evaluate('document.getElementById("setting-arrows").checked=false;document.getElementById("setting-arrows").dispatchEvent(new Event("change"))');
    await wait('document.getElementById("preview").contentWindow.getComputedStyle(document.getElementById("preview").contentDocument.querySelector(".hero-arrow")).display==="none"');
    async function add(type,location='page'){
      await evaluate(`Array.from(document.querySelectorAll('.add-between')).find(b=>b.dataset.location===${JSON.stringify(location)}&&!b.dataset.anchor&&!b.dataset.parent).click()`);
      await wait('document.getElementById("section-picker").open');const before=await evaluate('window.__SKThemeEditor.state.pages.home?.sections?.length||0');
      await evaluate(`document.querySelector('[data-section-type="${type}"]').click()`);
      assert.equal(await evaluate('window.__SKThemeEditor.state.pages.home?.sections?.length||0'),before);
      await wait('document.getElementById("section-sample").children.length>0');await evaluate('document.getElementById("section-add").click()');
      return evaluate(`window.__SKThemeEditor.state.${location==='page'?'pages.home':'shared'}.sections.at(-1).id`);
    }
    console.log('Theme UX: ready sections and live catalog');
    const slider=await add('product_slider');await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"] .theme-catalog-price')`);
    await evaluate('document.getElementById("setting-buttonText").value="تفاصيل المنتج";document.getElementById("setting-buttonText").dispatchEvent(new Event("input"))');
    await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"]').textContent.includes('تفاصيل المنتج')`);
    await evaluate('document.getElementById("setting-showPrice").checked=false;document.getElementById("setting-showPrice").dispatchEvent(new Event("change"))');
    await wait(`!document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"] .theme-catalog-price')`);
    await evaluate('document.getElementById("undo").click()');await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"] .theme-catalog-price')`);
    const imageText=await add('image_text');await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageText}"]')?.children.length===4`);
    const imageId=await evaluate('window.__SKThemeEditor.state.pages.home.sections.at(-1).children[0].id');
    await evaluate(`window.__SKThemeEditor.select({added:true,key:${JSON.stringify(imageId)}})`);
    await evaluate('document.getElementById("element-mobile-image").value="/icon-whatsapp.webp";document.getElementById("element-mobile-image").dispatchEvent(new Event("input"))');
    await evaluate('document.getElementById("mobile").click()');
    await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageId}"] source')?.srcset==='/icon-whatsapp.webp'`);
    await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageId}"] img')?.currentSrc.endsWith('/icon-whatsapp.webp')`);
    await evaluate('document.getElementById("style-width").value="100px";document.getElementById("style-width").dispatchEvent(new Event("input"))');
    await evaluate('document.getElementById("desktop").click()');
    await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageId}"] img')?.currentSrc.endsWith('/sk-main-logo.webp')`);
    await evaluate(`window.__SKThemeEditor.select({added:true,key:${JSON.stringify(imageText)}});document.querySelector('[data-action="duplicate"]').click()`);
    const duplicateId=await evaluate('window.__SKThemeEditor.state.pages.home.sections.at(-1).id');assert.notEqual(duplicateId,imageText);
    await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('#inspector label')).find(n=>n.firstChild.textContent==='Hide on Desktop'),input=label.querySelector('input');input.checked=true;input.dispatchEvent(new Event('change'));const mobile=Array.from(document.querySelectorAll('#inspector label')).find(n=>n.firstChild.textContent==='Hide on Mobile').querySelector('input');mobile.checked=false;mobile.dispatchEvent(new Event('change'))})()`);
    await wait(`document.getElementById('preview').contentWindow.getComputedStyle(document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageText}"]')).display==='none'`);
    await evaluate('document.getElementById("mobile").click()');
    await wait(`document.getElementById('preview').contentWindow.getComputedStyle(document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${imageText}"]')).display==='grid'`);
    await evaluate('document.getElementById("desktop").click()');

    await evaluate(`window.__SKThemeEditor.select({added:true,key:${JSON.stringify(duplicateId)}});document.querySelector('.remove-action').click()`);
    if(options.video){const recording=await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;const stream=canvas.captureStream(10),chunks=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm'});recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(r=>recorder.onstop=r);recorder.start();const paint=setInterval(()=>{const ctx=canvas.getContext('2d');ctx.fillStyle='rgb('+Math.floor(Math.random()*255)+',60,90)';ctx.fillRect(0,0,32,24);},40);await new Promise(r=>setTimeout(r,1000));clearInterval(paint);recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'});return new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob);});})()`);await options.video(recording);}
    for(const type of ['featured_product','products','collections','rich_text','banner','slider','video','collage','multicolumn','multirow','collapsible','page','whatsapp']){
      const id=await add(type);await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${id}"]')`);
      if(type==='video'){await evaluate(`(()=>{const input=Array.from(document.querySelectorAll('#inspector label')).find(n=>n.firstChild.textContent==='Hosted MP4 / WebM URL').querySelector('input');input.value='/test-media/clip.webm';input.dispatchEvent(new Event('input'))})()`);await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${id}"] video')?.readyState>=1`);await evaluate(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${id}"] video').play()`);await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${id}"] video').currentTime>0`);await evaluate('document.getElementById("setting-controls").checked=false;document.getElementById("setting-controls").dispatchEvent(new Event("change"))');await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${id}"] video')?.controls===false`);}
    }
    console.log('Theme UX: ordering and scoped settings');
    const ids=await evaluate('window.__SKThemeEditor.state.pages.home.sections.slice(-2).map(b=>b.id)');
    await evaluate(`(()=>{const a=document.querySelector('[data-node="${ids[1]}"]'),b=document.querySelector('[data-node="${ids[0]}"]'),data=new DataTransfer();a.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));b.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:data}));b.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:data}));})()`);
    await wait(`window.__SKThemeEditor.state.pages.home.sections.at(-2).id===${JSON.stringify(ids[1])}`);await evaluate('document.getElementById("undo").click()');
    assert.deepEqual(await evaluate('window.__SKThemeEditor.state.pages.home.sections.slice(-2).map(b=>b.id)'),ids);await evaluate('document.getElementById("redo").click()');
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await evaluate('document.getElementById("mobile").click()');
    const touchIds=await evaluate('window.__SKThemeEditor.state.pages.home.sections.slice(-2).map(b=>b.id)');
    const points=await evaluate(`(()=>{document.querySelector('[data-node="${touchIds[1]}"]').scrollIntoView({block:'nearest'});return ${JSON.stringify(touchIds.toReversed())}.map(id=>{const r=document.querySelector('[data-node="'+id+'"] .grab').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})})()`);
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[points[1]]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await wait(`window.__SKThemeEditor.state.pages.home.sections.at(-2).id===${JSON.stringify(touchIds[1])}`);
    await evaluate('document.getElementById("undo").click()');assert.deepEqual(await evaluate('window.__SKThemeEditor.state.pages.home.sections.slice(-2).map(b=>b.id)'),touchIds);
    await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('document.getElementById("desktop").click()');
    await evaluate('document.getElementById("global").click();Array.from(document.querySelectorAll(".setting-group-button")).find(b=>b.textContent==="Custom CSS").click()');
    await evaluate('document.getElementById("custom-css").value=".sk-header { border-radius: 11px; }";document.getElementById("custom-css").dispatchEvent(new Event("input"))');
    await wait('document.getElementById("preview").contentWindow.getComputedStyle(document.getElementById("preview").contentDocument.querySelector(".sk-header")).borderRadius==="11px"');
    assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".editor-top")).borderRadius'),'11px');
    await evaluate('document.getElementById("sections-tab").click();document.getElementById("save").click()');await wait('!window.__SKThemeEditor.dirty');
    assert.equal(await evaluate('fetch("/api/theme/published").then(r=>r.json()).then(d=>JSON.stringify(d.data.document))'),publishedBefore);
    await evaluate('delete window.__SKThemeEditor');await cdp('Page.reload');await wait(`window.__SKThemeEditor?.state.pages.home.sections.some(b=>b.id===${JSON.stringify(slider)}) && window.__SKThemeEditor.tree.length>0`);
    assert.equal(await evaluate(`window.__SKThemeEditor.state.pages.home.sections.find(b=>b.id===${JSON.stringify(imageText)}).children[0].content.mobileImage`),'/icon-whatsapp.webp');
    if(options.catalogChange){const product=await options.catalogChange(false);await evaluate('delete window.__SKThemeEditor');await cdp('Page.reload');await wait(`window.__SKThemeEditor && document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"]')?.textContent.includes(${JSON.stringify(product.name)})`);assert(await evaluate(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"]').textContent.includes(${JSON.stringify(product.price.toFixed(3))})`));assert(await evaluate(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"] [data-product-id="1"] img').src.endsWith('/icon-whatsapp.webp')`));await options.catalogChange(true);}
    console.log('Theme UX: new page, save, publish and history');
    await evaluate('document.getElementById("create-page").click()');await wait('document.getElementById("preview").contentWindow.__SKThemePreview?.page==="page_browser-page"');
    assert.equal(await evaluate('window.__SKThemeEditor.state.pages["page_browser-page"].sections.length'),0);
    await evaluate('document.querySelector(".add-between[data-location=page]").click()');await evaluate('document.querySelector("[data-section-type=rich_text]").click();document.getElementById("section-add").click()');
    await evaluate('document.getElementById("save").click()');await wait('!window.__SKThemeEditor.dirty');
    const revision=await evaluate('window.__SKThemeEditor.revision');
    await evaluate('document.getElementById("publish").click()');await wait(`window.__SKThemeEditor.revision>${revision}`);
    const publishedAfter=await evaluate('fetch("/api/theme/published").then(r=>r.json()).then(d=>JSON.stringify(d.data.document))');assert.notEqual(publishedAfter,publishedBefore);
    const historyBefore=await evaluate('window.__SKThemeEditor.revision');await evaluate('document.querySelector("#history .history-row:last-child button").click()');await wait(`window.__SKThemeEditor.revision>${historyBefore}`);
    assert.equal(await evaluate('fetch("/api/theme/published").then(r=>r.json()).then(d=>JSON.stringify(d.data.document))'),publishedAfter);
    const evidence=path.join(process.cwd(),'theme-editor-evidence.local');fs.mkdirSync(evidence,{recursive:true});
    await evaluate('document.getElementById("page").value="home";document.getElementById("page").dispatchEvent(new Event("change"))');await wait('document.getElementById("preview").contentWindow.__SKThemePreview?.page==="home"');
    await evaluate(`window.__SKThemeEditor.select({added:true,key:${JSON.stringify(slider)}})`);
    for(const [name,width,mobile] of [['desktop-v2',1600,false],['mobile-v2',390,true]]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile});await evaluate(`document.getElementById(${JSON.stringify(mobile?'mobile':'desktop')}).click()`);await sleep(300);await wait(`document.getElementById('preview').contentDocument.querySelector('[data-theme-added="${slider}"][data-theme-selected]')`);assert(await evaluate('document.querySelector(".editor-canvas").scrollWidth<=document.querySelector(".editor-canvas").clientWidth+2'));const image=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(image.data,'base64'));}
    assert.deepEqual(errors,[]);console.log('PASS Theme UX browser: Themes, independent draft, semantic tree, section picker, live products, responsive images, section types, ordering, undo/redo, scoped CSS, new page, save/reload, publish/restore.');
  }finally{
    socket?.close();browser.kill();
    await new Promise(resolve=>browser.exitCode!==null?resolve():browser.once('exit',resolve));
    const resolved=fs.realpathSync(profile);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sk-theme-browser-'));
    try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
  }
}
module.exports={checkThemeBrowser};
