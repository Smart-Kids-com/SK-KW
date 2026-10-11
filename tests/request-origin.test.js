'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedOrigin } = require('../services/request-origin');
const trusted = new Set(['https://smartkidskw.com', 'https://www.smartkidskw.com']);
const req = { protocol: 'http', get: name => name === 'host' ? 'smart-kids-kuwait-example.vercel.app' : 'attacker.example' };

test('Vercel HTTPS same-origin deployment login is accepted alongside canonical origins', () => {
  assert.equal(isAllowedOrigin(req, 'https://smart-kids-kuwait-example.vercel.app', trusted, { VERCEL: '1' }), true);
  assert.equal(isAllowedOrigin(req, 'https://www.smartkidskw.com', trusted, { VERCEL: '1' }), true);
  assert.equal(isAllowedOrigin(req, undefined, trusted, { VERCEL: '1' }), true);
});
test('foreign origins, forwarded host, scheme mismatch and malformed origins remain rejected', () => {
  for (const origin of ['https://attacker.example', 'https://another.vercel.app', 'https://smart-kids-kuwait-example.vercel.app.attacker.example', 'http://smart-kids-kuwait-example.vercel.app', 'null', 'https://smart-kids-kuwait-example.vercel.app/', 'https://user@smart-kids-kuwait-example.vercel.app']) {
    assert.equal(isAllowedOrigin(req, origin, trusted, { VERCEL: '1' }), false);
  }
});
test('local origin includes its actual port', () => {
  const local = { protocol: 'http', get: () => 'localhost:4567' };
  assert.equal(isAllowedOrigin(local, 'http://localhost:4567', trusted, {}), true);
  assert.equal(isAllowedOrigin(local, 'http://localhost:4568', trusted, {}), false);
});
