"use client";
import Link from 'next/link';

// يمكنك استبدال هذه الـ SVGs بمكونات منفصلة إذا أردت
function MenuIcon(props) {
  return (
    <svg {...props} width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect y="8" width="32" height="2" rx="1" fill="#2563eb"/>
      <rect y="15" width="32" height="2" rx="1" fill="#2563eb"/>
      <rect y="22" width="32" height="2" rx="1" fill="#2563eb"/>
    </svg>
  );
}
function SearchIcon(props) {
  return (
    <svg {...props} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function CartIcon(props) {
  return (
    <svg {...props} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6h15l-1.5 9h-13z"/>
      <circle cx="9" cy="20" r="1.5"/>
      <circle cx="18" cy="20" r="1.5"/>
      <path d="M6 6L5 2H2"/>
    </svg>
  );
}

export default function Header() {
  return (
    <header style={{ width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Top purple bar */}
      <div style={{
        background: '#3d0856',
        color: '#fff',
        textAlign: 'center',
        fontSize: '1.5rem',
        fontWeight: 400,
        padding: '1.2rem 0 1.1rem 0',
        letterSpacing: '0.01em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        position: 'relative'
      }}>
        {/* سهم جهة اليمين */}
        <span style={{ position: 'absolute', right: 28, fontSize: '2rem', top: '50%', transform: 'translateY(-50%)' }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M13 8l5 7-5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        التوصيل مجاناً للطلبات بقيمة 20 د.ك أو أكثر
      </div>
      {/* Main white header */}
      <div style={{
        background: '#fff',
        padding: '1.1rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        position: 'relative'
      }}>
        {/* Menu icon - left */}
        <button
          aria-label="open menu"
          style={{
            background: 'none',
            border: 'none',
            marginLeft: 16,
            marginRight: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <MenuIcon />
        </button>
        {/* Logo - center */}
        <Link href="/" style={{
          flex: 1,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0
        }}>
          <img
            src="/logo-sk-smart-kids.png"
            alt="شعار الأطفال المبتكرون SK Smart Kids"
            style={{
              height: 60,
              width: 'auto',
              maxWidth: 280,
              objectFit: 'contain'
            }}
          />
        </Link>
        {/* Icons - right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          marginRight: 20
        }}>
          <Link href="/search" aria-label="بحث">
            <SearchIcon />
          </Link>
          <Link href="/cart" aria-label="عربة التسوق">
            <CartIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}