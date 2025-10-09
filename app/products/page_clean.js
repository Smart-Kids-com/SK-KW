import { redirect } from 'next/navigation';

// Redirect /products to /collections/all to match Shopify structure
export default function ProductsRedirect() {
  redirect('/collections/all');
}
