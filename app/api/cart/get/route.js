// app/api/cart/get/route.js

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * هنا بتحط طريقة جلب بيانات السلة من الداتابيس
 * غيّر الدالة دي على حسب الـ ORM أو الداتابيس اللي عندك (Prisma, Mongo, Firestore...إلخ)
 */
async function getCartFromDB(cartId) {
  // مثال شكل الـ return المطلوب — عدله على كيفك
  // لو مافيش كارت رجّع null
  // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
  if (!cartId) return null;

  // TODO: استبدل الجزء ده باستعلام حقيقي من الداتابيس
  // ده بس مثال كارت تجريبي
  return {
    id: cartId,
    items: [
      // {
      //   productId: '123',
      //   name: 'Test Product',
      //   price: 10,
      //   quantity: 2,
      //   image: '/images/test.png',
      // },
    ],
    currency: 'KWD',
    subtotal: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/cart/get
 * 
 * يدعم:
 * - cartId في الـ query string  →  /api/cart/get?cartId=xxxx
 * - أو cartId من الكوكيز (مثلاً cookie اسمها cartId)
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // 1) جرّب تجيب cartId من الـ query
    let cartId = searchParams.get('cartId');

    // 2) لو مش موجود في الـ query؛ جبناه من الكوكيز
    if (!cartId) {
      const cookieStore = cookies();
      const cookieCartId = cookieStore.get('cartId');
      if (cookieCartId?.value) {
        cartId = cookieCartId.value;
      }
    }

    // لو ماعندناش cartId أصلاً → رجّع سلة فاضية
    if (!cartId) {
      return NextResponse.json(
        {
          success: true,
          cart: {
            id: null,
            items: [],
            currency: 'KWD',
            subtotal: 0,
            total: 0,
            updatedAt: null,
          },
        },
        { status: 200 }
      );
    }

    // جلب السلة من الداتابيس
    const cart = await getCartFromDB(cartId);

    // لو مافيش كارت في الداتابيس رجّع برضو سلة فاضية بنفس الشكل
    if (!cart) {
      return NextResponse.json(
        {
          success: true,
          cart: {
            id: cartId,
            items: [],
            currency: 'KWD',
            subtotal: 0,
            total: 0,
            updatedAt: null,
          },
        },
        { status: 200 }
      );
    }

    // كل شيء تمام
    return NextResponse.json(
      {
        success: true,
        cart,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/cart/get error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch cart.',
      },
      { status: 500 }
    );
  }
}