// app/api/cart/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCart, getCart, addLines, updateLines, removeLines } from '@/lib/cart';

const CART_COOKIE = 'cartId';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: 60 * 60 * 24 * 30
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('id');
    const jar = cookies();
    const id = fromParam || jar.get(CART_COOKIE)?.value;
    if (!id) return NextResponse.json({ cart: null }, { status: 200 });

    const cart = await getCart(id);
    if (!cart) {
      jar.set(CART_COOKIE, '', { ...cookieOptions, maxAge: 0 });
      return NextResponse.json({ cart: null }, { status: 200 });
    }
    jar.set(CART_COOKIE, cart.id, cookieOptions);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    const attributes = Array.isArray(body?.attributes) ? body.attributes : [];
    const cart = await createCart({ lines, attributes });
    cookies().set(CART_COOKIE, cart.id, cookieOptions);
    return NextResponse.json({ cart }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const jar = cookies();
    const id = body?.id || jar.get(CART_COOKIE)?.value;
    if (!id) return NextResponse.json({ error: 'Missing cart id' }, { status: 400 });

    let cart = null;
    if (body?.type === 'add') {
      if (!Array.isArray(body.lines) || !body.lines.length) {
        return NextResponse.json({ error: 'lines required for add' }, { status: 400 });
      }
      cart = await addLines(id, body.lines);
    } else if (body?.type === 'update') {
      if (!Array.isArray(body.lines) || !body.lines.length) {
        return NextResponse.json({ error: 'lines required for update' }, { status: 400 });
      }
      cart = await updateLines(id, body.lines);
    } else if (body?.type === 'remove') {
      if (!Array.isArray(body.lineIds) || !body.lineIds.length) {
        return NextResponse.json({ error: 'lineIds required for remove' }, { status: 400 });
      }
      cart = await removeLines(id, body.lineIds);
    } else {
      return NextResponse.json({ error: 'type must be one of add|update|remove' }, { status: 400 });
    }

    jar.set(CART_COOKIE, cart.id, cookieOptions);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const jar = cookies();
    const id = body?.id || jar.get(CART_COOKIE)?.value;
    if (!id) return NextResponse.json({ error: 'Missing cart id' }, { status: 400 });

    const lineIds = Array.isArray(body?.lineIds) ? body.lineIds : [];
    if (!lineIds.length) {
      return NextResponse.json({ error: 'lineIds required for delete' }, { status: 400 });
    }
    const cart = await removeLines(id, lineIds);
    jar.set(CART_COOKIE, cart.id, cookieOptions);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
