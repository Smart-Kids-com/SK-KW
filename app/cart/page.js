// app/cart/page.js
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCart } from '@/lib/cart';

export const dynamic = 'force-dynamic';

function formatMoney(amount, currency) {
  const num = Number(amount || 0);
  return `${num.toFixed(2)} ${currency || 'USD'}`;
}

function LineAttributes({ attrs }) {
  if (!Array.isArray(attrs) || !attrs.length) return null;
  return (
    <div style={{ marginTop: 8, background: '#f8f8fa', padding: '8px 10px', borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>خصائص العنصر:</div>
      <ul style={{ margin: 0, paddingInlineStart: 18 }}>
        {attrs.map((a, i) => (
          <li key={i}>{a.key}: {a.value}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function CartPage() {
  const jar = cookies();
  const cartId = jar.get('cartId')?.value || null;
  const cart = cartId ? await getCart(cartId).catch(() => null) : null;

  if (!cart || !cart.lines?.edges?.length) {
    return (
      <main style={{ padding: '24px' }}>
        <h1>سلة التسوق</h1>
        <p>السلة فارغة.</p>
        <Link href="/">العودة للتسوق</Link>
      </main>
    );
  }

  const currency = cart.cost?.totalAmount?.currencyCode || 'USD';

  return (
    <main style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <h1>سلة التسوق</h1>
      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0' }}>
        {cart.lines.edges.map(({ node }) => {
          const title = node?.merchandise?.product?.title || 'منتج';
          const variantTitle = node?.merchandise?.title || '';
          const img = node?.merchandise?.image?.url || null;
          const lineTotal = node?.cost?.totalAmount?.amount || '0.00';
          const attrs = node?.attributes || [];

          return (
            <li key={node.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={title} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />
                ) : null}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{title}</div>
                  <div style={{ color: '#555', fontSize: 14 }}>{variantTitle}</div>
                  <div style={{ marginTop: 6 }}>الكمية: {node.quantity}</div>
                  <LineAttributes attrs={attrs} />
                </div>
                <div style={{ minWidth: 120, textAlign: 'end' }}>
                  {formatMoney(lineTotal, currency)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          الإجمالي: {formatMoney(cart.cost?.totalAmount?.amount, currency)}
        </div>
        <Link
          href={cart.checkoutUrl || `/checkout?cartId=${encodeURIComponent(cart.id)}`}
          style={{ background: '#111', color: '#fff', padding: '12px 18px', borderRadius: 8, textDecoration: 'none' }}
        >
          إتمام الشراء
        </Link>
      </div>
    </main>
  );
}
