export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ensureCartAndCookie,
  CART_COOKIE,
  cookieOptionsBase,
  Facade,
} from '@/lib/server/shopify-cart';

/**
 * Body:
 * { lines: [{ id: string, quantity?: number, attributes?: [{ key, value }] }] }
 * لتحديث أكثر من Line في مرة واحدة.
 */
export async function POST(request) {
  try {
    const jar = cookies();
    const body = (await request.json().catch(() => ({}))) || {};

    const linesRaw = Array.isArray(body.lines) ? body.lines : [];
    if (!linesRaw.length) {
      return NextResponse.json(
        { success: false, error: 'lines required for batch update' },
        { status: 400 }
      );
    }

    // نضمن إن الكميات أرقام سليمة
    const lines = linesRaw.map((l) => {
      const obj = { ...l };
      if (obj.quantity != null) {
        obj.quantity = Number(obj.quantity);
      }
      return obj;
    });

    const cart = await ensureCartAndCookie(jar);
    const updated = await Facade.update(cart.id, lines);

    if (updated?.id) {
      jar.set(CART_COOKIE, updated.id, cookieOptionsBase);
    }

    return NextResponse.json(
      { success: true, cart: updated },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || 'update failed' },
      { status: 500 }
    );
  }
}
