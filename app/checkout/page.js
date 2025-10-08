// app/checkout/page.js
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCart } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export default async function CheckoutRedirect({ searchParams }) {
  const jar = cookies();
  const passedId = searchParams?.cartId || null;
  const cookieId = jar.get('cartId')?.value || null;
  const id = passedId || cookieId;
  if (!id) redirect('/cart');

  const cart = await getCart(id);
  if (!cart?.checkoutUrl) redirect('/cart');
  redirect(cart.checkoutUrl);
}
