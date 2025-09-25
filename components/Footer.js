import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, var(--color-dark) 0%, #1a1a1a 100%)',
      color: 'var(--color-white)',
      marginTop: 'auto'
    }}>
      {/* Main footer content */}
      <div style={{
        padding: '3rem 2rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Company Info */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                background: 'var(--gradient-accent)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                🧸
              </div>
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--color-white)',
                margin: 0
              }}>
                Smart Kids Kuwait
              </h3>
            </div>
            
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6',
              marginBottom: '1rem'
            }}>
              متجركم المفضل لأفضل الألعاب التعليمية والترفيهية للأطفال في الكويت. نسعى لتوفير منتجات عالية الجودة تساهم في تنمية مهارات أطفالكم.
            </p>

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                { icon: '📘', label: 'Facebook', href: '#' },
                { icon: '📷', label: 'Instagram', href: '#' },
                { icon: '🐦', label: 'Twitter', href: '#' },
                { icon: '📺', label: 'YouTube', href: '#' }
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    textDecoration: 'none',
                    fontSize: '1.2rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--color-primary)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-accent)'
            }}>
              روابط سريعة
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                { text: 'الرئيسية', href: '/' },
                { text: 'المجموعات', href: '/collections' },
                { text: 'البحث', href: '/search' },
                { text: 'عربة التسوق', href: '/cart' },
                { text: 'حسابي', href: '/account' }
              ].map((link, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={link.href}
                    style={{
                      color: 'rgba(255,255,255,0.8)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'var(--color-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255,255,255,0.8)';
                    }}
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-accent)'
            }}>
              خدمة العملاء
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                { text: 'اتصل بنا', href: '/contact' },
                { text: 'الأسئلة الشائعة', href: '/faq' },
                { text: 'سياسة الإرجاع', href: '/returns' },
                { text: 'الشحن والتوصيل', href: '/shipping' },
                { text: 'طرق الدفع', href: '/payment' }
              ].map((link, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={link.href}
                    style={{
                      color: 'rgba(255,255,255,0.8)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'var(--color-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255,255,255,0.8)';
                    }}
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: 'var(--color-accent)'
            }}>
              معلومات التواصل
            </h4>
            
            <div style={{ marginBottom: '0.8rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span>📍</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  الكويت، حولي
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span>📞</span>
                <a 
                  href="tel:+96512345678" 
                  style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  +965 1234 5678
                </a>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span>✉️</span>
                <a 
                  href="mailto:info@smartkidskw.com" 
                  style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  info@smartkidskw.com
                </a>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>🕐</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  السبت - الخميس: 9 صباحاً - 9 مساءً
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '1.5rem 2rem',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem'
          }}>
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} Smart Kids Kuwait. 
            تم التطوير بواسطة <span style={{ color: 'var(--color-accent)' }}>SK-KW Team</span>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '2rem',
            fontSize: '0.9rem'
          }}>
            <Link 
              href="/privacy" 
              style={{ 
                color: 'rgba(255,255,255,0.7)', 
                textDecoration: 'none' 
              }}
            >
              سياسة الخصوصية
            </Link>
            <Link 
              href="/terms" 
              style={{ 
                color: 'rgba(255,255,255,0.7)', 
                textDecoration: 'none' 
              }}
            >
              الشروط والأحكام
            </Link>
            <a 
              href="https://smartkidskw.com/" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                color: 'var(--color-accent)', 
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              المتجر الأصلي ←
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}