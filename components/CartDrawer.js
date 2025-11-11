// components/CartDrawer.js
'use client';
import Link from 'next/link';
import { useCartDrawer } from '@/lib/CartDrawerContext';

export default function CartDrawer() {
  const { isOpen, close, lastAdded, cart } = useCartDrawer();

  const goCheckout = () => {
    const url = cart?.checkoutUrl;
    if (url) window.location.href = url;
  };

  return (
    <div
      aria-hidden={!isOpen}
      style={{
        position: 'fixed',
        insetInline: 0,
        top: 0,
        transform: isOpen ? 'translateY(0%)' : 'translateY(-110%)',
        transition: 'transform .25s ease',
        zIndex: 1000,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          maxWidth: 960,
          background: 'white',
          borderRadius: '0 0 16px 16px',
          boxShadow: '0 10px 40px rgba(0,0,0,.18)',
          padding: '1rem',
          direction: 'rtl',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#1e3a8a',
            marginBottom: '.75rem',
          }}
        >
          <div>✓ تم إضافة المنتج إلى عربة التسوق بنجاح</div>
          <button
            onClick={close}
            aria-label="إغلاق"
            style={{
              background: 'transparent',
              border: 0,
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: '#1e3a8a',
            }}
          >
            ×
          </button>
        </div>

        {lastAdded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {lastAdded.image ? (
              <img
                src={lastAdded.image}
                alt={lastAdded.title}
                style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 12, background: '#f3f4f6' }} />
            )}
            <div style={{ color: '#1e3a8a' }}>
              <div style={{ fontWeight: 700 }}>{lastAdded.title}</div>
              <div style={{ opacity: 0.8, fontSize: '.95rem' }}>الكمية: {lastAdded.quantity}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '.85rem' }}>
          <Link
            href="/cart"
            onClick={close}
            style={{
              textAlign: 'center',
              padding: '0.9rem 1.2rem',
              borderRadius: 14,
              border: '2px solid #69207e',
              background: 'white',
              color: '#69207e',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 6px 16px rgba(0,0,0,.12)',
              textDecoration: 'none',
            }}
          >
            عرض عربة التسوق
          </Link>

          <button
            onClick={goCheckout}
            style={{
              padding: '0.95rem 1.2rem',
              borderRadius: 14,
              border: '2px solid #2b0c36',
              background: '#2b0c36',
              color: 'white',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 8px 22px rgba(0,0,0,.2)',
              cursor: 'pointer',
            }}
          >
            الذهاب للدفع
          </button>

          <button
            onClick={close}
            style={{
              background: 'transparent',
              border: 0,
              color: '#69207e',
              textDecoration: 'underline',
              fontWeight: 600,
              padding: '.5rem 0',
              cursor: 'pointer',
            }}
          >
            متابعة الشراء
          </button>
        </div>
      </div>
    </div>
  );
}
