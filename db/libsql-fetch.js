'use strict';

// The installed SDK passes node-fetch Request objects. Convert those requests
// without using its Response shim: that shim attaches a second stream reader
// before json()/arrayBuffer(), which can stall larger responses under Node 24.
async function libsqlFetch(input, init = {}) {
  const request = input && typeof input === 'object' && 'url' in input ? input : null;
  const url = request ? request.url : String(input);
  const method = init.method || request?.method || 'GET';
  const headers = init.headers || (request?.headers ? [...request.headers.entries()] : undefined);
  let body = init.body;
  if (body === undefined && request?.body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    body = Buffer.from(await request.arrayBuffer());
  }
  return globalThis.fetch(url, { ...init, method, headers, body, signal: init.signal || request?.signal });
}

module.exports = { libsqlFetch };
