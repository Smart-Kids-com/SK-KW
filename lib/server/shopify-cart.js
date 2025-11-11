// lib/server/shopify-cart.js
// Server helpers to communicate with /api/cart.
// These are safe to call from Server Components or Actions.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

async function api(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${BASE}/api/cart${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>''); 
    throw new Error(`Cart API ${path} failed: ${res.status} ${res.statusText} :: ${txt}`);
  }
  return res.json();
}

export async function getOrCreateCart() {
  const data = await api('', { method: 'GET' });
  return data.cart || null;
}

export async function addLines(cartId, lines) {
  const { cart } = await api('', { method: 'PUT', body: { id: cartId, type: 'add', lines } });
  return cart;
}

export async function updateLines(cartId, lines) {
  const { cart } = await api('', { method: 'PUT', body: { id: cartId, type: 'update', lines } });
  return cart;
}

export async function removeLines(cartId, lineIds) {
  const { cart } = await api('', { method: 'PUT', body: { id: cartId, type: 'remove', lineIds } });
  return cart;
}

export async function setNote(cartId, note) {
  // if your /api/cart supports note, you can forward it here; otherwise ignore
  try {
    const { cart } = await api('/note', { method: 'PUT', body: { id: cartId, note } });
    return cart;
  } catch {
    return getOrCreateCart();
  }
}
