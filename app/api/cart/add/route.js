// app/api/cart/add/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDB } from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { randomUUID } from 'crypto';

export async function POST(req) {
  try {
    const body = await req.json();
    const { productId, qty = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { message: 'productId is required' },
        { status: 400 }
      );
    }

    await connectToDB();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }

    const cookieStore = cookies();
    let cartId = cookieStore.get('cartId')?.value;

    // لو مفيش كارت قبل كده نعمل واحد جديد
    let cart;
    if (!cartId) {
      cart = await Cart.create({
        items: [{ product: product._id, qty, price: product.price }],
      });

      cartId = cart._id.toString();

      // نسيّب الـ cartId في Cookie
      const res = NextResponse.json(
        { message: 'Added to cart', cartId, count: qty },
        { status: 200 }
      );

      res.cookies.set('cartId', cartId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // حط مدة صلاحية مناسبة
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    } else {
      // فيه كارت موجود
      cart = await Cart.findById(cartId);
      if (!cart) {
        cart = await Cart.create({
          _id: cartId,
          items: [],
        });
      }

      const existingItem = cart.items.find(
        (item) => item.product.toString() === product._id.toString()
      );

      if (existingItem) {
        existingItem.qty += qty;
      } else {
        cart.items.push({
          product: product._id,
          qty,
          price: product.price,
        });
      }

      await cart.save();

      const count = cart.items.reduce((sum, item) => sum + item.qty, 0);

      return NextResponse.json(
        { message: 'Added to cart', cartId, count },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error('POST /api/cart/add error:', err);
    return NextResponse.json(
      { message: 'Error while adding to cart' },
      { status: 500 }
    );
  }
}