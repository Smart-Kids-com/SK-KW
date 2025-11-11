// app/api/cart/update/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureCartAndCookie, CART_COOKIE, cookieOptionsBase, Facade } from '@/lib/server/shopify-cart';

/**
 * Body:
 * { lines: [{ id: string, quantity?: number, attributes?: [{key,value}] }] }
 * Batch update multiple lines.
 */
export async function POST(request) {
  try {
    const jar = cookies();
    const body = await request.json().catch(() => ({}));
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (!lines.length) {
      return NextResponse.json({ success: false, error: 'lines required for batch update' }, { status: 400 });
    }
    const cart = await ensureCartAndCookie(jar);
    const updated = await Facade.update(cart.id, lines);
    jar.set(CART_COOKIE, updated.id, cookieOptionsBase);
    return NextResponse.json({ success: true, cart: updated }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message || 'update failed' }, { status: 500 });
  }
}
