'use strict';

// End-to-end verification of the disposable demo, never the normal server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const base = 'http://127.0.0.1:4310';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(route, options = {}) {
  return fetch(base + route, { redirect: 'manual', ...options });
}

async function main() {
  assert.ok(typeof WebSocket === 'function', 'Run this browser verifier with Node 24');
  const originals = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/admin-assets/manifest.json'), 'utf8'));
  assert.equal(originals.length, 15);
  for (const asset of originals) {
    assert.match(asset.local, /^\/admin-assets\/[a-zA-Z0-9_-]+\.png$/);
    const bytes = fs.readFileSync(path.join(__dirname, '../public', asset.local));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    const response = await request(asset.local);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), asset.sha256);
  }
  // The helper is an isolation marker. Refuse to test ordinary app instances.
  const helper = await fetch('http://127.0.0.1:4311/');
  assert.match(await helper.text(), /Local-SK-Demo!2026/);
  for (const route of ['/api/orders', '/api/customers', '/api/admin-dashboard/stats']) {
    assert.equal((await request(route)).status, 401);
  }
  for (const route of ['/orders-admin.html', '/admin-enhanced', '/admin-enhanced.html', '/customers-admin', '/products-admin']) {
    assert.equal((await request(route)).status, 302);
  }
  assert.equal((await request('/api/orders', { headers: { cookie: `sk_admin_session=${'a'.repeat(64)}; smartkids_admin_auth=1; smartkids_admin_otp=1` } })).status, 401);
  assert.equal((await request('/api/products')).status, 200);
  assert.equal((await request('/')).status, 200);
  const failed = await request('/admin-login', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: 'incorrect', next: '//example.invalid' })
  });
  assert.equal(failed.status, 302);
  assert.match(failed.headers.get('location'), /^\/admin\?/);
  assert.doesNotMatch(failed.headers.get('location'), /example\.invalid/);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-demo-browser-'));
  const browserPath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(file => fs.existsSync(file));
  assert.ok(browserPath, 'A local Chromium browser is required');
  const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--no-default-browser-check', '--metrics-recording-only',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Browser startup timed out')), 20000);
      browser.stderr.on('data', chunk => {
        output += chunk.toString();
        const match = output.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      browser.on('error', reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    let blockedExternal = 0;
    function command(method, params = {}, sessionId) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15000);
        pending.set(id, { resolve, reject, timeout });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    }
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const callback = pending.get(message.id);
        if (!callback) return;
        clearTimeout(callback.timeout); pending.delete(message.id);
        message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
      } else if (message.method === 'Fetch.requestPaused') {
        const url = message.params.request.url;
        const local = url.startsWith(base + '/') || url.startsWith('data:');
        if (!local) blockedExternal++;
        command(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
          requestId: message.params.requestId, ...(!local ? { errorReason: 'BlockedByClient' } : {})
        }, message.sessionId).catch(() => {});
      }
    });
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params) => command(method, params, sessionId);
    await cdp('Page.enable'); await cdp('Network.enable'); await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('Browser evaluation failed');
      return result.result.value;
    };
    async function wait(expression) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return;
        await sleep(100);
      }
      throw new Error('Application UI did not reach the expected state');
    }
    await cdp('Page.navigate', { url: base + '/admin?next=/orders-admin.html' });
    await wait('!!document.querySelector("input[name=password]")');
    await evaluate('document.querySelector("input[name=password]").value="Local-SK-Demo!2026"; document.querySelector("form").requestSubmit();');
    await wait('!!document.querySelector("input[name=otp]")');
    const preOtp = await cdp('Network.getCookies', { urls: [base] });
    const challenge = preOtp.cookies.find(cookie => cookie.name === 'sk_admin_challenge');
    assert.ok(challenge); assert.ok(!preOtp.cookies.some(cookie => cookie.name === 'sk_admin_session'));
    assert.equal((await request('/api/orders', { headers: { cookie: `${challenge.name}=${challenge.value}` } })).status, 401);
    assert.equal(await evaluate('document.body.textContent.includes("JBSWY3DPEHPK3PXP") || !!document.querySelector("img[src*=data]")'), false);
    // Always use a fresh step so repeated runs respect real replay protection.
    const previousOtp = await (await fetch('http://127.0.0.1:4311/otp')).json();
    await sleep((previousOtp.remainingSeconds + 1) * 1000);
    const otp = await (await fetch('http://127.0.0.1:4311/otp')).json();
    await evaluate(`document.querySelector("input[name=otp]").value=${JSON.stringify(otp.otp)}; document.querySelector("form").requestSubmit();`);
    await wait('location.pathname==="/orders-admin.html" && document.querySelectorAll("#desktopOrdersTableBody tr").length===2 && document.body.textContent.includes("SK-DEMO-2")');
    const cookies = await cdp('Network.getCookies', { urls: [base] });
    const session = cookies.cookies.find(cookie => cookie.name === 'sk_admin_session');
    assert.ok(session && session.httpOnly && session.sameSite === 'Strict');
    const savedCookie = `${session.name}=${session.value}`;
    const orders = await request('/api/orders', { headers: { cookie: savedCookie } });
    assert.equal(orders.status, 200);
    assert.match(await orders.text(), /SK-DEMO-2/);
    if (process.argv.includes('--diagnose-dashboard')) {
      await cdp('Page.navigate', { url: base + '/admin-enhanced' });
      await wait('!!document.querySelector(".sk-nav-stack")');
      await sleep(1500);
      console.log('Dashboard diagnosis:', JSON.stringify(await evaluate('({cssRules:Array.from(document.styleSheets).reduce((n,s)=>n+s.cssRules.length,0),externalCss:Array.from(document.querySelectorAll("link[rel=stylesheet]")).map(n=>n.href),images:Array.from(document.images).map(n=>({url:n.src,loaded:n.complete && n.naturalWidth>0})),navLineHeight:getComputedStyle(document.querySelector(".sk-nav-item")).lineHeight})')));
      await cdp('Page.navigate', { url: base + '/orders-admin.html' });
      await wait('document.body.textContent.includes("SK-DEMO-2")');
    }
    async function safeText() {
      const result = await evaluate('({xss:window.__demoXss || 0,images:document.querySelectorAll("#desktopOrdersTableBody img, #mobileOrdersList img").length,text:document.querySelector("#desktopOrdersTableBody").textContent + document.querySelector("#mobileOrdersList").textContent})');
      assert.equal(result.xss, 0); assert.equal(result.images, 0);
      assert.match(result.text, /<img src=x onerror=/);
    }
    await safeText();
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    const desktop = await cdp('Page.captureScreenshot', { format: 'png' });
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-demo-evidence-'));
    fs.writeFileSync(path.join(screenshots, 'orders-desktop.png'), Buffer.from(desktop.data, 'base64'));
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await safeText();
    const mobile = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshots, 'orders-mobile.png'), Buffer.from(mobile.data, 'base64'));
    await evaluate('document.querySelector("[data-admin-navigation] form[action=\\"/admin-logout\\"]").requestSubmit();');
    await wait('location.pathname==="/admin" && !!document.querySelector("input[name=password]")');
    assert.equal((await request('/api/orders', { headers: { cookie: savedCookie } })).status, 401);
    await cdp('Page.navigate', { url: base + '/orders-admin.html' });
    await wait('location.pathname==="/admin"');
    await cdp('Network.clearBrowserCookies');
    for (const route of ['/orders-admin.html', '/admin-enhanced']) {
      await cdp('Page.navigate', { url: base + route });
      await wait(`location.pathname==="/admin" && !!document.querySelector("input[name=password]") && document.querySelector("input[name=next]").value===${JSON.stringify(route)}`);
    }
    await evaluate('document.querySelector("input[name=password]").value="Local-SK-Demo!2026"; document.querySelector("form").requestSubmit();');
    await wait('location.pathname==="/admin-otp" && !!document.querySelector("input[name=otp]")');
    const secondChallenge = (await cdp('Network.getCookies', { urls: [base] })).cookies.find(cookie => cookie.name === 'sk_admin_challenge');
    for (const route of ['/admin-enhanced', '/orders-admin.html']) {
      assert.equal((await request(route, { headers: { cookie: `${secondChallenge.name}=${secondChallenge.value}` } })).status, 302);
    }
    const previousDashboardOtp = await (await fetch('http://127.0.0.1:4311/otp')).json();
    await sleep((previousDashboardOtp.remainingSeconds + 1) * 1000);
    const dashboardOtp = await (await fetch('http://127.0.0.1:4311/otp')).json();
    await evaluate(`document.querySelector("input[name=otp]").value=${JSON.stringify(dashboardOtp.otp)}; document.querySelector("form").requestSubmit();`);
    await wait('location.pathname==="/admin-enhanced" && !!document.querySelector(".sk-nav-stack") && Array.from(document.images).every(n=>n.complete && n.naturalWidth>0)');
    const dashboard = await evaluate('({images:Array.from(document.images).map(n=>({url:n.src,loaded:n.complete && n.naturalWidth>0})),cssRules:Array.from(document.styleSheets).reduce((n,s)=>n+s.cssRules.length,0),lineHeight:getComputedStyle(document.querySelector(".sk-nav-item")).lineHeight,labels:Array.from(document.querySelectorAll(".sk-nav-stack img")).map(n=>n.alt).join(" ")})');
    assert.ok(dashboard.cssRules > 100);
    assert.equal(dashboard.lineHeight, '0px'); // Preserve the original image-button layout.
    assert.match(dashboard.labels, /Orders/);
    assert.equal(dashboard.images.length, originals.length);
    assert.ok(dashboard.images.length && dashboard.images.every(image => image.loaded && image.url.startsWith(base + '/')));
    const dashboardCookie = (await cdp('Network.getCookies', { urls: [base] })).cookies.find(cookie => cookie.name === 'sk_admin_session');
    const dashboardSavedCookie = `${dashboardCookie.name}=${dashboardCookie.value}`;
    assert.equal((await request('/api/admin-dashboard/summary', { headers: { cookie: dashboardSavedCookie } })).status, 200);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
    fs.writeFileSync(path.join(screenshots, 'dashboard-desktop.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    fs.writeFileSync(path.join(screenshots, 'dashboard-mobile.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    await evaluate('document.querySelector("form[action=\\"/admin-logout\\"]").requestSubmit();');
    await wait('location.pathname==="/admin" && !!document.querySelector("input[name=password]")');
    for (const route of ['/admin-enhanced', '/orders-admin.html']) {
      assert.equal((await request(route, { headers: { cookie: dashboardSavedCookie } })).status, 302);
      await cdp('Page.navigate', { url: base + route });
      await wait('location.pathname==="/admin" && !!document.querySelector("input[name=password]")');
    }
    console.log('PASS: clean browser protects both pages before password/OTP and after dashboard logout; all original images served locally with matching SHA-256; original image-button layout restored.');
    console.log('PASS: actual server anonymous API/page guards, forged cookies, wrong password and safe redirect.');
    console.log('PASS: browser password -> unprivileged challenge -> OTP -> orders API and desktop/mobile safe text.');
    console.log('PASS: browser logout revokes copied cookie; protected page redirects to login again.');
    console.log(`Browser evidence: ${screenshots}; intercepted external requests blocked: ${blockedExternal}.`);
  } finally {
    if (socket) socket.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once('exit', resolve));
    // Chrome subprocesses may briefly retain profile files on Windows.
    await sleep(1000);
    const resolvedProfile = fs.realpathSync(profile);
    assert.equal(path.dirname(resolvedProfile), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolvedProfile).startsWith('sk-demo-browser-'));
    try { fs.rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
}
main().catch(error => { console.error(`Demo verification failed: ${error.message}`); process.exitCode = 1; });
