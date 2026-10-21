'use strict';

// No app, database, credentials or real transports are used in these focused tests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('raw Browser and CAPI payloads agree; receipts contain only allowed fields', async () => {
  process.env.META_PIXEL_ID = '899390561983033';
  process.env.META_CAPI_TOKEN = 'synthetic-token-not-for-network';
  delete process.env.META_TEST_EVENT_CODE;
  const capi = require('../services/meta-capi');
  const originalFetch = global.fetch, originalInfo = console.info;
  const logs = [], browserCalls = [];
  let outgoing;
  console.info = (...args) => logs.push(args);
  global.fetch = async (url, options) => {
    outgoing = JSON.parse(options.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ events_received: 1, fbtrace_id: 'mock_trace_123' }) };
  };
  try {
    const order = { order_number: 'SK4109', total: 20, customer_email: 'private@example.invalid',
      customer_phone: '99999999', items: [{ product_id: '3', quantity: 1, price: 18 }] };
    await capi.sendMetaPurchase({ req: { headers: {} }, order });
    const event = outgoing.data[0];
    assert.equal(event.event_name, 'Purchase');
    assert.equal(event.event_id, 'purchase_SK4109');
    assert(!Object.hasOwn(event.custom_data, 'event_id'));
    assert.equal(event.custom_data.order_id, 'SK4109');
    const window = { location: { search: '' }, fbq: (...args) => browserCalls.push(args) };
    const context = vm.createContext({ window, document: { readyState: 'complete', addEventListener() {} },
      console: { info: (...args) => logs.push(args), log() {} }, URLSearchParams });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/meta-pixel.js'), 'utf8'), context);
    window.SmartKidsPixel.trackPurchase({ eventId: event.event_id, value: 20, currency: 'KWD', ids: ['3'], quantity: 1 });
    const browser = browserCalls.find(args => args[1] === 'Purchase');
    assert.equal(browser[0], 'track');
    assert.equal(browser[3].eventID, event.event_id);
    assert.equal(browser[2].value, event.custom_data.value);
    assert.equal(browser[2].currency, event.custom_data.currency);
    assert.deepEqual(Array.from(browser[2].content_ids), event.custom_data.content_ids);
    assert.equal(browser[2].value, 20);
    assert.deepEqual(event.custom_data.content_ids, ['3']);
    assert.equal(logs.length, 2);
    const receipts = logs.map(args => JSON.parse(args[1]));
    for (const receipt of receipts) {
      assert.equal(receipt.order_number, 'SK4109');
      assert.equal(receipt.event_id, 'purchase_SK4109');
      assert(Number.isFinite(Date.parse(receipt.sent_at)));
      assert(Object.keys(receipt).every(k => ['order_number', 'event_id', 'channel', 'sent_at', 'result', 'fbtrace_id'].includes(k)));
    }
    assert.equal(receipts[0].result.events_received, 1);
    assert.equal(receipts[0].fbtrace_id, 'mock_trace_123');
    assert.equal(receipts[1].channel, 'Browser');
    // Rejections must not expose the provider's body or token-bearing error messages.
    global.fetch = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({
      error: { code: 100, message: 'private@example.invalid synthetic-token-not-for-network', fbtrace_id: 'mock_rejected' }
    }) });
    await assert.rejects(capi.sendMetaPurchase({ req: {}, order }), /HTTP 400/);
    global.fetch = async () => { throw Error('private@example.invalid synthetic-token-not-for-network'); };
    await assert.rejects(capi.sendMetaPurchase({ req: {}, order }), /before a response/);
    global.fetch = async () => { const error = Error('private'); error.name = 'AbortError'; throw error; };
    await assert.rejects(capi.sendMetaPurchase({ req: {}, order }), /timed out/);
    const text = JSON.stringify(logs);
    assert(!text.includes('private@example.invalid'));
    assert(!text.includes('synthetic-token-not-for-network'));
    assert(!text.includes('99999999'));
    assert.equal(logs.length, 5); // exactly one receipt for each attempt, including failures
  } finally { global.fetch = originalFetch; console.info = originalInfo; }
});

test('thank-you reload preserves the sent marker and cannot dispatch the same Purchase twice', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/thank-you.html'), 'utf8');
  const functions = html.slice(html.indexOf('    function getPurchaseEventKey('), html.indexOf('    function renderOrder('));
  const storage = new Map(), calls = [];
  const runPage = () => {
    const context = vm.createContext({ sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
      SmartKidsPixel: { trackPurchase: data => calls.push(data) }, normalizeItems: order => order.items, console });
    vm.runInContext(functions + ';trackPurchaseEvent({order_number:"SK4109",total:20,items:[{product_id:"3",quantity:1}]})', context);
  };
  runPage(); runPage(); // separate JS contexts model a reload with the same sessionStorage
  assert.equal(calls.length, 1);
  assert.equal(calls[0].eventId, 'purchase_SK4109');
  const checkout = fs.readFileSync(path.join(__dirname, '../public/checkout.html'), 'utf8');
  const success = checkout.indexOf('if (response.ok && result && result.success === true)');
  assert(success > 0);
  assert(checkout.indexOf("localStorage.setItem('last_order'", success) > success);
});
