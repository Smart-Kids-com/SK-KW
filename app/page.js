"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getCollections } from '../lib/shopify';
import { t } from '../lib/i18n';

export default function Home({ params }) {
  const locale = "ar";
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const fetchedCollections = await getCollections();
        setCollections(fetchedCollections);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    }
    fetchCollections();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #132e90 0%, #1e3a8a 50%, #df5299 100%)',
        color: 'var(--color-white)',
        padding: '4rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'float 6s ease-in-out infinite'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-heading)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            lineHeight: '1.2'
          }}>
            🎨 مرحباً بكم في عالم الألعاب 🎮
          </h1>
          
          <p style={{
            fontSize: '1.3rem',
            marginBottom: '2.5rem',
            opacity: 0.9,
            lineHeight: '1.6'
          }}>
            اكتشفوا أفضل الألعاب التعليمية والترفيهية للأطفال في الكويت<br/>
            <strong>Smart Kids Kuwait</strong> - متجركم المفضل لسعادة أطفالكم
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              href="#collections"
              className="btn"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--color-dark)',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '30px',
                boxShadow: 'var(--shadow-lg)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--shadow-lg)';
              }}
            >
              🛍️ تسوق الآن
            </Link>
            
            <Link 
              href="/search"
              className="btn btn-outline"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'var(--color-white)',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '30px',
                border: '2px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🔍 استكشف المنتجات
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '4rem 2rem',
        background: 'var(--color-gray-light)'
      }}>
        <div className="container">
          <h2 style={{
            textAlign: 'center',
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '3rem',
            color: 'var(--color-primary)'
          }}>
            لماذا نحن الخيار الأفضل؟
          </h2>
          
          <div className="grid grid-3" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { icon: '🚚', title: 'توصيل سريع', desc: 'توصيل مجاني لجميع أنحاء الكويت' },
              { icon: '✅', title: 'جودة مضمونة', desc: 'منتجات أصلية وآمنة للأطفال' },
              { icon: '💰', title: 'أسعار تنافسية', desc: 'أفضل الأسعار مع عروض حصرية' }
            ].map((feature, index) => (
              <div 
                key={index}
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {feature.icon}
                </div>
                <h3 style={{ 
                  color: 'var(--color-primary)', 
                  marginBottom: '1rem',
                  fontSize: '1.3rem'
                }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--color-gray)', lineHeight: '1.6' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section id="collections" style={{
        padding: '4rem 2rem',
        background: 'var(--color-white)'
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: '1rem'
            }}>
              � مجموعات الألعاب المميزة
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: 'var(--color-gray)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              اكتشفوا مجموعاتنا المتنوعة من الألعاب التعليمية والترفيهية المناسبة لجميع الأعمار
            </p>
          </div>

          <div className="grid grid-2" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '2rem', 
            justifyContent: 'center' 
          }}>
            {collections.map((col, index) => (
              <Link 
                key={col.handle} 
                href={`/collections/${col.handle}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block'
                }}
              >
                <div
                  className="card"
                  style={{
                    width: '320px',
                    padding: '0',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-10px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow)';
                  }}
                >
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={col.image?.src || '/placeholder-collection.jpg'} 
                      alt={col.image?.alt || col.title}
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                    
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      right: '15px',
                      background: 'var(--gradient-secondary)',
                      color: 'var(--color-white)',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      boxShadow: 'var(--shadow)'
                    }}>
                      جديد
                    </div>

                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '3rem 1.5rem 1.5rem',
                      color: 'var(--color-white)'
                    }}>
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        margin: '0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        {col.title}
                      </h3>
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    {col.description && (
                      <p style={{
                        color: 'var(--color-gray)',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        margin: '0 0 1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {col.description}
                      </p>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '1rem'
                    }}>
                      <span style={{
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}>
                        استكشف المجموعة ←
                      </span>
                      <div style={{
                        background: 'var(--color-primary)',
                        color: 'var(--color-white)',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>
                        🎯
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'var(--gradient-primary)',
        color: 'var(--color-white)',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            🎁 احصل على خصم 15% على أول طلبية!
          </h2>
          <p style={{
            fontSize: '1.1rem',
            marginBottom: '2rem',
            opacity: 0.9
          }}>
            اشترك في نشرتنا الإخبارية واحصل على آخر العروض والمنتجات الجديدة
          </p>
          
          <div style={{
            maxWidth: '500px',
            margin: '0 auto',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <input
              type="email"
              placeholder="أدخل بريدك الإلكتروني"
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '1rem 1.5rem',
                borderRadius: '30px',
                border: 'none',
                fontSize: '1rem',
                textAlign: 'right',
                direction: 'rtl'
              }}
            />
            <button
              className="btn"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--color-dark)',
                padding: '1rem 2rem',
                borderRadius: '30px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              اشترك الآن 📧
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}