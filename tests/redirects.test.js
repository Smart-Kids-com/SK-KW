'use strict';
const isolation = require('./security-support');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../services/redirects');
let db, app, server, base, cookie, originals, stock, orders;
async function request(path, { method = 'GET', body, admin = true, origin = base } = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { ...(admin ? { Cookie: cookie } : {}), ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: response.status, location: response.headers.get('location'), text, json };
}
const create = (source, destination, extra = {}) => request('/api/redirects-admin', { method: 'POST', body: { source_path: source, destination_path: destination, status_code: 301, ...extra } });
const row = source => db.get('SELECT * FROM redirects WHERE source_path=?', [source]);
before(async () => {
  db = await require('../scripts/security-demo-fixtures').seedSecurityDemo();
  originals = await db.all('SELECT * FROM redirects ORDER BY id');
  stock = await db.all('SELECT id,stock,on_hand,committed,unavailable FROM products ORDER BY id');
  orders = await db.get('SELECT COUNT(*) n FROM orders');
  const wrapper = require('express')();
  server = wrapper.listen(0, '127.0.0.1');
  await require('node:events').once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  process.env.PUBLIC_ORIGIN = base;
  app = require('../server'); wrapper.use(app);
  const jar = new Map();
  for (const [route, body] of [['/admin-login', { password: process.env.ADMIN_PASSWORD_1 }], ['/admin-otp', { otp: require('speakeasy').totp({ secret: process.env.ADMIN_OTP_SECRET, encoding: 'base32' }) }]]) {
    const r = await fetch(base + route, { method: 'POST', redirect: 'manual', headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: [...jar].map(([k,v]) => k+'='+v).join('; ') }, body: new URLSearchParams(body) });
    for (const entry of r.headers.getSetCookie()) { const [k,...v] = entry.split(';')[0].split('='); v.join('=') ? jar.set(k,v.join('=')) : jar.delete(k); }
  }
  assert(jar.has('sk_admin_session'));
  cookie = [...jar].map(([k,v]) => k+'='+v).join('; ');
});
after(async () => {
  server?.closeAllConnections(); if (server) await new Promise(r => server.close(r));
  app?.locals.adminAuth.close(); if (db) (await db.ensureTursoClient()).close();
});

test('authentication and origin checks protect every redirect mutation', async () => {
  for (const method of ['GET','POST','PATCH','DELETE']) {
    assert.equal((await request('/api/redirects-admin' + (['PATCH','DELETE'].includes(method) ? '/1' : ''), { method, admin: false, body: method === 'GET' ? undefined : { source_path:'/qa-denied', destination_path:'/about.html' } })).status, 401);
  }
  assert.equal((await request('/redirects-admin.html', { admin:false })).status,302);
  assert.equal((await request('/api/redirects-admin', { method:'POST', origin:'https://attacker.example', body:{source_path:'/qa-denied',destination_path:'/about.html'} })).status,403);
  assert.equal(await row('/qa-denied'),null);
});

test('301, HEAD and query merge preserve slug, UTM, repeated values and fragment', async () => {
  assert.equal((await create('/qa-301','/product-page.html?slug=fixture&campaign=target#details')).status,200);
  const suffix='?utm_source=ads&slug=untrusted&campaign=source&tag=a&tag=b&fbclid=synthetic';
  for (const method of ['GET','HEAD']) {
    const r=await request('/qa-301'+suffix,{method,admin:false}); assert.equal(r.status,301);
    const u=new URL(r.location,base);assert.equal(u.origin,base);assert.equal(u.searchParams.get('slug'),'fixture');assert.equal(u.searchParams.get('utm_source'),'ads');assert.equal(u.searchParams.get('campaign'),'target');assert.deepEqual(u.searchParams.getAll('tag'),['a','b']);assert.equal(u.searchParams.get('fbclid'),'synthetic');assert.equal(u.hash,'#details');
    if(method==='HEAD')assert.equal(r.text,'');
  }
  assert.equal(service.sourcePath('/products/%D9%83%D8%AA%D8%A7%D8%A8'),'/products/%D9%83%D8%AA%D8%A7%D8%A8');
});

test('edit, 302, disable, delete and missing-record 404 are truthful', async () => {
  await create('/qa-crud','/about.html');const item=await row('/qa-crud');
  assert.equal((await request('/api/redirects-admin/'+item.id,{method:'PATCH',body:{destination_path:'/contact.html',status_code:302}})).status,200);
  assert.equal((await request('/qa-crud?utm_medium=test',{admin:false})).location,'/contact.html?utm_medium=test');
  assert.equal((await request('/qa-crud',{admin:false})).status,302);
  await request('/api/redirects-admin/'+item.id,{method:'PATCH',body:{is_active:0}});
  assert.equal((await request('/qa-crud',{admin:false})).status,404);
  assert.equal((await request('/api/redirects-admin/'+item.id,{method:'DELETE'})).status,200);
  assert.equal((await request('/api/redirects-admin/'+item.id,{method:'DELETE'})).status,404);
  assert.equal((await request('/api/redirects-admin/'+item.id,{method:'PATCH',body:{notes:'missing'}})).status,404);
  assert.equal((await request('/api/redirects-admin/1.5',{method:'DELETE'})).status,400);
});

test('external, protocol-relative, encoded and malformed destinations are rejected', async () => {
  for(const target of ['https://attacker.example','http://attacker.example','//attacker.example','/\\attacker.example','/%2fattacker.example','/%5cattacker.example','/%252fattacker.example','/x/%252e%252e//attacker.example','/x/%25252e%25252e//attacker.example','javascript:alert(1)','/bad\r\nLocation:x']) {
    assert.equal((await create('/qa-invalid',target)).status,400,target);
  }
  assert.equal((await create('/qa-query-source?x=1','/about.html')).status,400);
  assert.equal((await create('/qa-status','/about.html',{status_code:307})).status,400);
  assert.equal(await row('/qa-invalid'),null);
});

test('self loops, query-only self loops and multi-hop loops are rejected on create and edit', async () => {
  assert.equal((await create('/qa-self','/qa-self')).status,400);
  assert.equal((await create('/qa-self','/qa-self?lang=ar')).status,400);
  await create('/qa-a','/qa-b');await create('/qa-b','/qa-c');
  assert.equal((await create('/qa-c','/qa-a')).status,400);
  await create('/qa-c','/contact.html');const c=await row('/qa-c');
  assert.equal((await request('/api/redirects-admin/'+c.id,{method:'PATCH',body:{destination_path:'/qa-a'}})).status,400);
  assert.equal((await row('/qa-c')).destination_path,'/contact.html');
});

test('duplicates return 409 without overwrite; concurrent opposing redirects cannot introduce cycles', async () => {
  await create('/qa-duplicate','/about.html');
  assert.equal((await create('/qa-duplicate','/contact.html')).status,409);
  assert.equal((await create('/qa-parent/../qa-duplicate','/contact.html')).status,409);
  assert.equal((await row('/qa-duplicate')).destination_path,'/about.html');
  await create('/qa-rename','/about.html');const item=await row('/qa-rename');
  assert.equal((await request('/api/redirects-admin/'+item.id,{method:'PATCH',body:{source_path:'/qa-duplicate'}})).status,409);
  const duplicate=await Promise.all([create('/qa-race','/about.html'),create('/qa-race','/contact.html')]);assert.deepEqual(duplicate.map(r=>r.status).sort(),[200,409]);
  const opposing=await Promise.all([create('/qa-race-a','/qa-race-b'),create('/qa-race-b','/qa-race-a')]);assert.deepEqual(opposing.map(r=>r.status).sort(),[200,400]);
});

test('runtime also refuses unsafe legacy rows without rewriting them', async () => {
  for(const [source,target]of [['/qa-legacy-external','//attacker.example'],['/qa-legacy-self','/qa-legacy-self'],['/qa-legacy-a','/qa-legacy-b'],['/qa-legacy-b','/qa-legacy-a']])await db.run('INSERT INTO redirects(source_path,destination_path,status_code,is_active) VALUES(?,?,301,1)',[source,target]);
  const snapshot=await db.all("SELECT * FROM redirects WHERE source_path LIKE '/qa-legacy-%' ORDER BY id");
  for(const item of snapshot)assert.equal((await request(item.source_path,{admin:false})).status,404);
  assert.deepEqual(await db.all("SELECT * FROM redirects WHERE source_path LIKE '/qa-legacy-%' ORDER BY id"),snapshot);
});

test('browser renders stored XSS and API errors as text, and edit/delete controls work', async () => {
  const payload='<img src="/__qa_missing_image" onerror="window.__redirectXss=1">';
  await create('/qa-xss','/about.html',{notes:payload});
  await require('../scripts/check-admin-read-browser').checkAdminReadBrowser(base,{cookie,run:async({cdp,evaluate,wait})=>{
    await cdp('Page.navigate',{url:base+'/redirects-admin.html'});
    await wait('document.querySelector("#redirectsBody")?.textContent.includes('+JSON.stringify(payload)+')');
    assert.equal(await evaluate('!!window.__redirectXss'),false);assert.equal(await evaluate('document.querySelectorAll("#redirectsBody img").length'),0);
    await evaluate('[...document.querySelectorAll("#redirectsBody tr")].find(r=>r.textContent.includes("/qa-xss")).querySelector("button.secondary").click()');
    assert.equal(await evaluate('document.querySelector("#notes").value'),payload);
    await evaluate('document.querySelector("#notes").value="Edited text";saveRedirect()');
    await wait('document.querySelector("#redirectId").value===""&&document.querySelector("#redirectsBody").textContent.includes("Edited text")');
    await evaluate('window.confirm=()=>true;[...document.querySelectorAll("#redirectsBody tr")].find(r=>r.textContent.includes("/qa-xss")).querySelector("button.danger").click()');
    await wait('!document.querySelector("#redirectsBody").textContent.includes("/qa-xss")');
    await evaluate('(()=>{const original=window.fetch;window.fetch=(url,options)=>url==="/api/redirects-admin"?Promise.resolve(new Response(JSON.stringify({success:false,error:'+JSON.stringify(payload)+'}),{status:500,headers:{"Content-Type":"application/json"}})):original(url,options);return loadRedirects();})()');
    assert.equal(await evaluate('document.querySelector("#redirectsBody td").textContent'),payload);assert.equal(await evaluate('!!window.__redirectXss'),false);
  }});
});

test('original redirects, orders and product inventory remain unchanged; no external effects', async () => {
  assert.deepEqual(await db.all('SELECT * FROM redirects WHERE id IN ('+originals.map(()=>'?').join(',')+') ORDER BY id',originals.map(r=>r.id)),originals);
  assert.deepEqual(await db.all('SELECT id,stock,on_hand,committed,unavailable FROM products ORDER BY id'),stock);
  assert.deepEqual(await db.get('SELECT COUNT(*) n FROM orders'),orders);
  assert.equal(isolation.blockedEffects.length,0);
});
