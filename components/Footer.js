"use client";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a8a 100%)',
      color: '#fff',
      marginTop: 'auto'
    }}>
      {/* Main Footer */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '3rem 2rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          marginBottom: '2rem'
        }}>
          
          {/* Right Side - Social Media */}
          <div style={{
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <a href="https://www.facebook.com/KuwaitSmartKids" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                <svg aria-hidden="true" focusable="false" class="icon icon-facebook" viewBox="0 0 20 20">
  <path fill="currentColor" d="M18 10.049C18 5.603 14.419 2 10 2c-4.419 0-8 3.603-8 8.049C2 14.067 4.925 17.396 8.75 18v-5.624H6.719v-2.328h2.03V8.275c0-2.017 1.195-3.132 3.023-3.132.874 0 1.79.158 1.79.158v1.98h-1.009c-.994 0-1.303.621-1.303 1.258v1.51h2.219l-.355 2.326H11.25V18c3.825-.604 6.75-3.933 6.75-7.951Z"></path>
</svg> Facebook
              </a>
              <a href="https://instagram.com/smartkidskw" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                📷 Instagram
              </a>
              <a href="https://youtube.com/smartkidskw" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                📺 YouTube
              </a>
              <a href="https://tiktok.com/@smartkidskw" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                🎵 TikTok
              </a>
              <a href="https://pinterest.com/smartkidskw" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                📌 Pinterest
              </a>
              <a href="https://snapchat.com/add/smartkidskw" style={{ 
                color: 'rgba(255,255,255,0.8)', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                👻 Snapchat
              </a>
            </div>
          </div>

          {/* Middle - Company Info */}
          <div style={{
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '1.5rem'
            }}>
              <img 
                src="/logo-sk-smart-kids.png" 
                alt="Logo of SK Smart Kids with a colorful character and text."
                style={{
                  width: '180px',
                  height: 'auto',
                  filter: 'brightness(1.2)',
                  marginBottom: '1rem'
                }}
              />
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              smartkidskw.com
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              INNOVATORS GULF TRADING W.L.L
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.8)'
            }}>
              All Rights Reserved - جميع الحقوق محفوظة
            </div>
          </div>

          {/* Left Side - Email Subscription */}
          <div style={{
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '1rem',
              marginBottom: '1rem',
              color: 'rgba(255,255,255,0.9)'
            }}>
              أدخل بريدك الإلكتروني - سجل الآن!
            </div>
            <div style={{
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center'
            }}>
              Email
            </div>
          </div>
          
        </div>
      </div>

      {/* Footer Links */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '1.5rem 2rem'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '1rem'
          }}>
            © 2025 INNOVATORS GULF TRADING W.L.L All Rights reserved. Smart Kids Kuwait - الأطفال المبتكرون الكويت
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.85rem'
          }}>
            <a href="/refund" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Refund policy
            </a>
            <a href="/privacy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Privacy policy
            </a>
            <a href="/terms" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Terms of service
            </a>
            <a href="/shipping" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Shipping policy
            </a>
            <a href="/contact" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              Contact information
            </a>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <span>💳 KNET</span>
            <span>💳 MasterCard</span>
            <span>💳 VISA</span>
            <span>💳 AMEX</span>
            <span>🍎 Apple Pay</span>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          footer > div:first-child > div {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            gap: 2rem !important;
          }
          
          footer a[href*="facebook"],
          footer a[href*="instagram"],
          footer a[href*="youtube"],
          footer a[href*="tiktok"],
          footer a[href*="pinterest"],
          footer a[href*="snapchat"] {
            justify-content: center !important;
          }

          footer div[style*="gap: 2rem"] {
            gap: 1rem !important;
            flex-direction: column;
          }
        }

        @media (min-width: 769px) {
          footer > div:first-child > div {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}