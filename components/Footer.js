"use client";
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
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M22.675 0h-21.35C.596 0 0 .597 0 1.333v21.333C0 23.403.596 24 1.325 24H12.82V14.706H9.692V11.2h3.129V8.654c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.765V11.2h3.59l-.467 3.506h-3.123V24h6.127C23.405 24 24 23.403 24 22.667V1.333C24 .597 23.405 0 22.675 0z" fill="currentColor"/>
  </svg>
  Facebook
</a>

              <a href="https://www.instagram.com/kuwaitsmartkids/" style={{ 
  color: 'rgba(255,255,255,0.8)', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem'
}}>
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display:'block' }}>
    <path fill="currentColor" d="M7 2h10c2.761 0 5 2.239 5 5v10c0 2.761-2.239 5-5 5H7c-2.761 0-5-2.239-5-5V7c0-2.761 2.239-5 5-5zm0 2C5.346 4 4 5.346 4 7v10c0 1.654 1.346 3 3 3h10c1.654 0 3-1.346 3-3V7c0-1.654-1.346-3-3-3H7zm5 3a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6zm5.5-.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"/>
  </svg>
  Instagram
</a>

              <a href="https://www.youtube.com/@SmartKids-Gulf" style={{ 
  color: 'rgba(255,255,255,0.8)', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem'
}}>
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display:'block' }}>
    <path fill="currentColor" d="M23.498 6.186a2.99 2.99 0 0 0-2.106-2.117C19.585 3.5 12 3.5 12 3.5s-7.585 0-9.392.569A2.99 2.99 0 0 0 .502 6.186C0 8 0 12 0 12s0 4 .502 5.814a2.99 2.99 0 0 0 2.106 2.117C4.415 20.5 12 20.5 12 20.5s7.585 0 9.392-.569a2.99 2.99 0 0 0 2.106-2.117C24 16 24 12 24 12s0-4-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z"/>
  </svg>
  YouTube
</a>

              <a href="https://www.tiktok.com/@smartkids.gulf" style={{ 
  color: 'rgba(255,255,255,0.8)', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem'
}}>
  <svg width="24" height="24" viewBox="0 0 16 16" aria-hidden="true" style={{ display:'block' }}>
    <path fill="currentColor" d="M9 3v12.5a3.5 3.5 0 1 1-3-3.465V9.5a6 6 0 1 0 7.5 5.842V7.034c.923.656 2.056 1.12 3.5 1.212V6.25c-1.501-.09-2.634-.73-3.5-1.637V3H9z"/>
  </svg>
  TikTok
</a>

             <a href="https://www.pinterest.com/smartkidsgulf" style={{ 
  color: 'rgba(255,255,255,0.8)', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem'
}}>
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display:'block' }}>
    <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12c0 4.991 3.657 9.128 8.438 10.018-.117-.852-.223-2.157.047-3.087.242-.83 1.561-5.287 1.561-5.287s-.398-.797-.398-1.976c0-1.852 1.074-3.235 2.41-3.235 1.136 0 1.683.852 1.683 1.873 0 1.141-.726 2.846-1.1 4.425-.313 1.322.665 2.402 1.969 2.402 2.364 0 3.966-3.036 3.966-6.63 0-2.732-1.839-4.787-5.187-4.787-3.778 0-6.137 2.824-6.137 5.98 0 1.087.42 2.254.946 2.888.104.125.119.234.088.36-.097.392-.311 1.234-.354 1.405-.055.223-.179.271-.414.164-1.543-.714-2.504-2.952-2.504-4.754 0-3.866 2.809-7.414 8.1-7.414 4.252 0 7.566 3.032 7.566 7.092 0 4.226-2.664 7.628-6.365 7.628-1.243 0-2.414-.646-2.813-1.409l-.764 2.913c-.276 1.066-1.023 2.4-1.522 3.215C9.8 23.72 10.88 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
  Pinterest
</a>

              <a href="https://www.snapchat.com/add/smart.kidskw" style={{ 
  color: 'rgba(255,255,255,0.8)', 
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem'
}}>
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ display:'block' }}>
    <path fill="currentColor" d="M12 0C7.74 0 4.663 2.582 4.07 6.048c-.11.648-.111 1.343.101 1.985.277.835.925 1.473 1.81 1.754-.026.262-.04.524-.04.787 0 1.058.306 2.018.72 2.774.528.972 1.203 1.67 1.877 2.14.552.384 1.055.649 1.41.826-.016.243-.025.49-.025.739 0 1.26.365 2.297.844 3.09.472.773 1.026 1.286 1.342 1.536.204.164.396.262.496.311.1-.049.292-.147.496-.311.316-.25.87-.763 1.342-1.536.479-.793.844-1.83.844-3.09 0-.249-.009-.496-.025-.739.355-.177.858-.442 1.41-.826.674-.47 1.349-1.168 1.877-2.14.414-.756.72-1.716.72-2.774 0-.263-.014-.525-.04-.787.885-.281 1.533-.919 1.81-1.754.212-.642.211-1.337.101-1.985C19.337 2.582 16.26 0 12 0z"/>
  </svg>
  Snapchat
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
                src="//smart-kids.me/cdn/shop/files/Logo_smart_kids-of-header-tag.png?v=1756574543&amp;width=1340"
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
        borderTop: '1px solid rgba(122, 1, 175, 0.1)',
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
            <Link href="/policies/refund-policy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              سياسة الإرجاع
            </Link>
            <Link href="/policies/privacy-policy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              سياسة الخصوصية
            </Link>
            <Link href="/policies/terms-of-service" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              شروط الخدمة
            </Link>
            <Link href="/policies/shipping-policy" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              سياسة الشحن
            </Link>
            <Link href="/about" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              من نحن
            </Link>
            <Link href="/contact" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
              اتصل بنا
            </Link>
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
            <img src="https://cdn.shopify.com/shopifycloud/checkout-web/assets/1636e49a98c1bfc06ec1.svg" alt="KNET" style={{ width: 51, height: 28 }} />
            <img src="https://cdn.shopify.com/shopifycloud/checkout-web/assets/c1.en/assets/mastercard.1c4_lyMp.svg" alt="MasterCard" style={{ width: 51, height: 28 }} />
            <img src="https://cdn.shopify.com/shopifycloud/checkout-web/assets/c1.en/assets/visa.sxIq5Dot.svg" alt="VISA" style={{ width: 51, height: 28 }} />
            <img src="https://cdn.shopify.com/shopifycloud/checkout-web/assets/c1.en/assets/amex.Csr7hRoy.svg" alt="American Express" style={{ width: 51, height: 28 }} />
            <img src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/apple-pay.icon.svg?v=1757219416" alt="Apple Pay" style={{ width: 46, height: 28 }} />
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