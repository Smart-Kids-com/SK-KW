// app/api/cart/get/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureCartAndCookie, CART_COOKIE, cookieOptionsBase } from '@/lib/server/shopify-cart';

export async function GET() {
  try {
    const jar = cookies();
    const cart = await ensureCartAndCookie(jar);
    jar.set(CART_COOKIE, cart.id, cookieOptionsBase);
    return NextResponse.json({ success: true, cart }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e?.message || 'get failed' }, { status: 500 });
  }
}
