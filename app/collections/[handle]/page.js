import { getCollectionByHandle } from '../../../lib/shopify';
import ProductCard from '../../../components/ProductCard';
import { t } from '../../../lib/i18n';
import Link from 'next/link';

export default async function CollectionPage({ params }) {
  const locale = "ar";
  const decodedHandle = decodeURIComponent(params.handle);
  const collection = await getCollectionByHandle(decodedHandle);

  if (!collection) {
    return (
      <div className="container" style={{ 
        padding: '4rem 2rem', 
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          😕
        </div>
        
        <h1 style={{
          fontSize: '2rem',
          color: 'var(--color-primary)',
          marginBottom: '1rem'
        }}>
          {t("collections.not_found", locale) || "هذه المجموعة غير موجودة"}
        </h1>
        
        <p style={{
          color: 'var(--color-gray)',
          fontSize: '1.1rem',
          marginBottom: '2rem',
          maxWidth: '500px',
          lineHeight: '1.6'
        }}>
          عذراً، المجموعة التي تبحث عنها غير متوفرة حالياً. يمكنك استكشاف مجموعاتنا الأخرى أو العودة للصفحة الرئيسية.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link 
            href="/" 
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            🏠 العودة للرئيسية
          </Link>
          <Link 
            href="/search" 
            className="btn btn-outline"
            style={{ textDecoration: 'none' }}
          >
            🔍 البحث عن المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Collection Header */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
        color: 'var(--color-white)',
        padding: '3rem 2rem',
        marginBottom: '3rem'
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          {/* Breadcrumb */}
          <nav style={{ 
            marginBottom: '2rem',
            fontSize: '0.9rem',
            opacity: 0.8 
          }}>
            <Link 
              href="/" 
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              الرئيسية
            </Link>
            <span style={{ margin: '0 0.5rem' }}>←</span>
            <span>المجموعات</span>
            <span style={{ margin: '0 0.5rem' }}>←</span>
            <span style={{ fontWeight: 600 }}>{collection.title}</span>
          </nav>

          <h1 style={{
            fontSize: '3rem',
            fontWeight: 700,
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            🎯 {collection.title}
          </h1>
          
          {collection.description && (
            <div style={{
              fontSize: '1.2rem',
              marginBottom: '2rem',
              opacity: 0.9,
              maxWidth: '600px',
              margin: '0 auto 2rem',
              lineHeight: '1.6'
            }} 
            dangerouslySetInnerHTML={{ 
              __html: collection.descriptionHtml || collection.description 
            }} />
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.8rem 1.5rem',
              borderRadius: '25px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{ fontWeight: 600 }}>
                📦 {collection.products?.length || 0} منتج متوفر
              </span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.8rem 1.5rem',
              borderRadius: '25px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{ fontWeight: 600 }}>
                🚚 توصيل مجاني
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="container" style={{ paddingBottom: '4rem' }}>
        {/* Filter/Sort Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
          padding: '1.5rem',
          background: 'var(--color-white)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ 
              fontWeight: 600, 
              color: 'var(--color-primary)',
              fontSize: '1.1rem'
            }}>
              ترتيب حسب:
            </span>
            
            <select style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              border: '2px solid var(--color-gray-light)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              minWidth: '150px'
            }}>
              <option>الأحدث</option>
              <option>السعر: من الأقل للأعلى</option>
              <option>السعر: من الأعلى للأقل</option>
              <option>الأكثر مبيعاً</option>
              <option>الأعلى تقييماً</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ 
              color: 'var(--color-gray)',
              fontSize: '0.9rem'
            }}>
              عرض {collection.products?.length || 0} من {collection.products?.length || 0} منتج
            </span>

            <div style={{
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button style={{
                padding: '0.5rem',
                border: '2px solid var(--color-primary)',
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}>
                ⊞
              </button>
              <button style={{
                padding: '0.5rem',
                border: '2px solid var(--color-gray-light)',
                background: 'transparent',
                color: 'var(--color-gray)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer'
              }}>
                ⚏
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {collection.products?.length > 0 ? (
          <div className="grid" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2rem',
            justifyContent: 'center'
          }}>
            {collection.products.map((product, index) => (
              <div 
                key={product.handle}
                className="fade-in"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <ProductCard product={product} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--color-white)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              📦
            </div>
            
            <h3 style={{
              fontSize: '1.5rem',
              color: 'var(--color-primary)',
              marginBottom: '1rem'
            }}>
              لا توجد منتجات في هذه المجموعة حالياً
            </h3>
            
            <p style={{
              color: 'var(--color-gray)',
              marginBottom: '2rem',
              maxWidth: '400px',
              margin: '0 auto 2rem'
            }}>
              نعمل على إضافة منتجات جديدة قريباً. تابعونا للحصول على آخر التحديثات!
            </p>

            <Link 
              href="/" 
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              استكشف المجموعات الأخرى
            </Link>
          </div>
        )}

        {/* Load More Button */}
        {collection.products?.length >= 12 && (
          <div style={{
            textAlign: 'center',
            marginTop: '3rem'
          }}>
            <button className="btn btn-outline" style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem'
            }}>
              عرض المزيد من المنتجات
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .fade-in {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
        
        @keyframes fadeInUp {
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