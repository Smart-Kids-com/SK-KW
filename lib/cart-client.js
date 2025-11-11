// lib/cart-client.js
// Small fetch helpers from the client side (browser) to hit our API routes.

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const cartApi = {
  get: () => jsonFetch('/api/cart/get'),
  add: (lines) => jsonFetch('/api/cart/add', { method: 'POST', body: { lines } }),
  change: (payload) => jsonFetch('/api/cart/change', { method: 'POST', body: payload }),
  update: (lines) => jsonFetch('/api/cart/update', { method: 'POST', body: { lines } }),
  clear: () => jsonFetch('/api/cart/clear', { method: 'DELETE' }),
};
