// app/api/cart/change/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureCartAndCookie, CART_COOKIE, cookieOptionsBase, Facade } from '@/lib/server/shopify-cart';

/**
 * Body:
 * { lineId: string, quantity?: number, attributes?: [{key,value}] }
 * Updates a single line.
 */
export async function POST(request) {
  try {
    const jar = cookies();
    const body = await request.json().catch(() => ({}));
    const { lineId, quantity, attributes } = body || {};

    if (!lineId) {
      return NextResponse.json({ success: false, error: 'lineId is required' }, { status: 400 });
    }
    if (quantity != null && (!Number.isFinite(quantity) || quantity < 0)) {
      return NextResponse.json({ success: false, error: 'quantity must be >= 0' }, { status: 400 });
    }

    const cart = await ensureCartAndCookie(jar);

    const updateObj = { id: lineId };
    if (quantity != null) updateObj.quantity = Number(quantity);
    if (Array.isArray(attributes)) updateObj.attributes = attributes;

    const updated = await Facade.update(cart.id, [updateObj]);
    jar.set(CART_COOKIE, updated.id, cookieOptionsBase);
    return NextResponse.json({ success: true, cart: updated }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message || 'change failed' }, { status: 500 });
  }
}
