'use strict';

// Loaded before application modules: no .env, production databases, mail or Meta.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL, fileURLToPath } = require('node:url');
const Module = require('node:module');

const temporaryRoot = fs.realpathSync(os.tmpdir());
const directory = process.env.SK_SECURITY_TEST_DIRECTORY || fs.mkdtempSync(path.join(temporaryRoot, 'sk-security-test-'));
if (path.dirname(fs.realpathSync(directory)) !== temporaryRoot || !path.basename(directory).startsWith('sk-security-test-')) {
  throw new Error('Test database directory is not an allocated temporary directory');
}
for (const key of Object.keys(process.env)) {
  if (/DATABASE|TURSO|ADMIN_|AUTH_|RESEND|MAIL_|META_|PUBLIC_ORIGIN|VERCEL|NODE_ENV/.test(key)) {
    delete process.env[key];
  }
}
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = pathToFileURL(path.join(directory, 'store.db')).href;
process.env.AUTH_DATABASE_URL = pathToFileURL(path.join(directory, 'auth.db')).href;
process.env.ADMIN_PASSWORD_1 = crypto.randomBytes(32).toString('hex');
process.env.ADMIN_OTP_SECRET = 'JBSWY3DPEHPK3PXP'; // Synthetic test fixture only.
process.env.AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

const blockedEffects = [];
const deny = label => { blockedEffects.push(label); throw new Error('External effect blocked by security tests'); };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'dotenv') return { config: () => deny('dotenv') };
  if (name === 'resend') return { Resend: class { constructor() { deny('email'); } } };
  if (name.endsWith('/utils/email')) return { sendOrderEmails: async () => deny('email'),sendInvoiceEmail: async args => {
    if(invoiceTestSender)return invoiceTestSender(args);
    return deny('email');
  } };
  if (name.endsWith('/services/meta-capi')) return { sendMetaPurchase: async () => deny('meta') };
  const result = originalLoad.call(this, name, parent, isMain);
  if (name === '@libsql/client') {
    return { ...result, createClient(config) {
      if (!config.url.startsWith('file:') || config.syncUrl || config.authToken) deny('database');
      const target = fileURLToPath(config.url);
      if (path.dirname(target) !== directory) deny('database');
      return result.createClient(config);
    } };
  }
  return result;
};

// Block all external transports, including direct sockets. Loopback HTTP is for tests.
for (const name of ['node:net', 'node:tls']) {
  const transport = require(name);
  for (const method of ['connect', 'createConnection']) {
    if (!transport[method]) continue;
    const original = transport[method];
    transport[method] = function (...args) {
      const options = args[0];
      const host = typeof options === 'object' ? options.host : args[1];
      if (!['127.0.0.1', '::1', 'localhost'].includes(host)) deny('network');
      return original.apply(this, args);
    };
  }
}
const socketConnect = require('node:net').Socket.prototype.connect;
require('node:net').Socket.prototype.connect = function (...args) {
  let options = args[0];
  if (Array.isArray(options)) options = options[0];
  const host = typeof options === 'object' ? options.host : args[1];
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) deny('network');
  return socketConnect.apply(this, args);
};
const originalFetch = global.fetch;
global.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') deny('network');
  return originalFetch(input, options);
};
require('node:dgram').createSocket = () => deny('network');
require('node:http2').connect = () => deny('network');

let invoiceTestSender=null;
module.exports = { directory, blockedEffects, deny, setInvoiceTestSender(sender){invoiceTestSender=sender;} };
