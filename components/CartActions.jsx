// components/CartActions.jsx
'use client';

import { useState } from 'react';

export default function CartActions() {
  const [loading, setLoading] = useState(false);

  async function goCheckout() {
    try {
      setLoading(true);
      const r = await fetch('/cart/get', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      }
      window.location.href = '/checkout'; // fallback
    } finally { setLoading(false); }
  }

  async function clearCart() {
    try {
      setLoading(true);
      await fetch('/cart/clear', { method: 'POST' });
      window.location.reload();
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display:'grid', gap:12, padding:16, borderRadius:16, background:'#fff',
                  boxShadow:'0 8px 24px rgba(0,0,0,.08)' }}>
      <button onClick={goCheckout} disabled={loading}
              style={{ padding:'14px 18px', borderRadius:12, border:'none',
                       background:'linear-gradient(135deg,#8efcff,#a88bff)', color:'#0a1636',
                       fontWeight:800, fontSize:'1rem', cursor:'pointer' }}>
        {loading ? '… جاري التحويل' : 'الذهاب للدفع'}
      </button>
      <button onClick={clearCart} disabled={loading}
              style={{ padding:'12px 16px', borderRadius:12, border:'1px solid #e2e8f0',
                       background:'#fafafa', color:'#333', fontWeight:700, fontSize:'.95rem',
                       cursor:'pointer' }}>
        تفريغ السلة
      </button>
      <a href="/collections/all" style={{ textAlign:'center', fontWeight:700, textDecoration:'none',
                                         color:'#5b21b6', paddingTop:6 }}>
        متابعة التسوّق
      </a>
    </div>
  );
}
