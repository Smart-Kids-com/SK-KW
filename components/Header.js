import Link from 'next/link';
import CartIcon from './icons/CartIcon';
import SearchIcon from './icons/SearchIcon';

export default function Header() {
  return (
    <header style={{
      background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a8a 100%)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(19, 46, 144, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        fontSize: '0.9rem'
      }}>
        ⭐ مرحباً بكم في Smart Kids Kuwait - متجركم المفضل لألعاب الأطفال ⭐
      </div>
      
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '1rem 1rem'
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: '1.8rem',
          color: '#fff',
          textDecoration: 'none',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            background: 'var(--gradient-accent)',
            borderRadius: '50%',
            width: '45px',
            height: '45px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            🧸
          </div>
          Smart Kids Kuwait
        </Link>

        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '25px',
          padding: '0.5rem 1rem',
          minWidth: '300px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <SearchIcon style={{ marginLeft: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }} />
          <input
            type="text"
            placeholder="ابحث عن الألعاب..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              flex: 1,
              fontSize: '1rem',
              direction: 'rtl',
              textAlign: 'right'
            }}
          />
        </div>

        {/* Navigation links */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          <Link href="/" style={{
            color: '#fff',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
          }}>
            الرئيسية
          </Link>

          <Link href="/search" style={{
            color: '#fff',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
          }}>
            البحث
          </Link>

          <Link href="/cart" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#fff',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
          }}>
            <CartIcon style={{ width: '20px', height: '20px' }} />
            عربة التسوق
            <span style={{
              background: 'var(--color-accent)',
              color: 'var(--color-dark)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              position: 'absolute',
              top: '-5px',
              left: '-5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              0
            </span>
          </Link>

          <Link href="/account" style={{
            color: '#fff',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateY(0)';
          }}>
            حسابي
          </Link>
        </div>
      </nav>
    </header>
  );
}