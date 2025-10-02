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
                <img src="/social/facebook.svg" alt="Facebook" style={{ width: 24, height: 24 }} />
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
                <img src="/social/instagram.svg" alt="Instagram" style={{ width: 24, height: 24 }} />
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
                <img src="/social/youtube.svg" alt="YouTube" style={{ width: 24, height: 24 }} />
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
                <img src="/social/tiktok.svg" alt="TikTok" style={{ width: 24, height: 24 }} />
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
                <img src="/social/pinterest.svg" alt="Pinterest" style={{ width: 24, height: 24 }} />
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
                <img src="/social/snapchat.svg" alt="Snapchat" style={{ width: 24, height: 24 }} />
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