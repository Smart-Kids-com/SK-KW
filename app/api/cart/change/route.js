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
 * { lineId: string, quantity?: number, attributes?: [{ key, value }] }
 * لتحديث Line واحد في السلة.
 */
export async function POST(request) {
  try {
    const jar = cookies();
    const body = (await request.json().catch(() => ({}))) || {};

    const lineId = body.lineId;
    if (!lineId) {
      return NextResponse.json(
        { success: false, error: 'lineId is required' },
        { status: 400 }
      );
    }

    const quantity =
      body.quantity !== undefined && body.quantity !== null
        ? Number(body.quantity)
        : undefined;
    const attributes = Array.isArray(body.attributes)
      ? body.attributes
      : undefined;

    const cart = await ensureCartAndCookie(jar);

    const updateObj = { id: lineId };
    if (quantity != null && !Number.isNaN(quantity)) {
      updateObj.quantity = quantity;
    }
    if (attributes) {
      updateObj.attributes = attributes;
    }

    const updated = await Facade.update(cart.id, [updateObj]);

    if (updated?.id) {
      jar.set(CART_COOKIE, updated.id, cookieOptionsBase);
    }

    return NextResponse.json(
      { success: true, cart: updated },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || 'change failed' },
      { status: 500 }
    );
  }
}