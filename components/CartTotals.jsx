// components/CartTotals.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';

function formatMoney(amount, currency = 'KWD') {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);
}

export default function CartTotals() {
  const [state, setState] = useState({
    loading: true,
    subtotal: 0,
    total: 0,
    currency: 'KWD',
    itemCount: 0,
  });

  const readCart = useCallback(async () => {
    try {
      const r = await fetch('/cart/get', { cache: 'no-store' });
      const data = await r.json().catch(() => ({}));

      const cart = data?.cart || data || {};
      const cost = cart?.cost || {};

      const amt = (x) =>
        x?.amount ?? x?.amountV2?.amount ?? (typeof x === 'number' ? x : 0);

      const subtotal =
        Number(amt(cost.subtotalAmount)) ||
        Number(amt(cost.subtotalAmountEstimated)) ||
        0;

      const total =
        Number(amt(cost.totalAmount)) ||
        Number(amt(cost.totalAmountEstimated)) ||
        subtotal;

      const currency =
        cost.totalAmount?.currencyCode ||
        cost.subtotalAmount?.currencyCode ||
        'KWD';

      const itemCount =
        cart?.totalQuantity ??
        (Array.isArray(cart?.lines)
          ? cart.lines.reduce((a, l) => a + (l?.quantity || 0), 0)
          : 0);

      setState({ loading: false, subtotal, total, currency, itemCount });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    readCart();
    const onUpdated = () => readCart();
    window.addEventListener('cart:updated', onUpdated);
    return () => window.removeEventListener('cart:updated', onUpdated);
  }, [readCart]);

  const { loading, subtotal, total, currency, itemCount } = state;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        <span>عدد المنتجات</span>
        <span>{loading ? '…' : itemCount}</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span>المجموع الفرعي</span>
        <span style={{ fontWeight: 700 }}>
          {loading ? '…' : formatMoney(subtotal, currency)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 10,
          opacity: 0.8,
        }}
      >
        <span>الشحن</span>
        <span>يُحسب عند الدفع</span>
      </div>

      <hr
        style={{
          border: 0,
          height: 1,
          background: '#edf2f7',
          margin: '10px 0',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontWeight: 800 }}>الإجمالي</span>
        <span
          style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0a1636' }}
        >
          {loading ? '…' : formatMoney(total, currency)}
        </span>
      </div>
    </div>
  );
}
