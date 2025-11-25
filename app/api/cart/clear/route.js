export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ensureCartAndCookie,
  CART_COOKIE,
  cookieOptionsBase,
  clearAllLines,
} from '@/lib/server/shopify-cart';

export async function DELETE() {
  try {
    const jar = cookies();
    const cart = await ensureCartAndCookie(jar);
    const updated = await clearAllLines(cart.id);

    if (updated?.id) {
      jar.set(CART_COOKIE, updated.id, cookieOptionsBase);
    }

    return NextResponse.json(
      { success: true, cart: updated },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || 'clear failed' },
      { status: 500 }
    );
  }
}