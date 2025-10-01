"use client";
import Link from 'next/link';
import { t } from '../lib/i18n';

export default function ProductCard({ product, locale = "ar" }) {
  const isAvailable = product.variants?.[0]?.availableForSale;
  
  return (
    <div
      className="card fade-in"
      style={{
        width: '280px',
        background: 'var(--color-white)',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        marginBottom: '2rem',
        direction: 'rtl',
        transition: 'all 0.4s ease',
        border: '1px solid rgba(19, 46, 144, 0.1)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = 'var(--shadow)';
      }}
    >
      <Link 
        href={`/products/${product.handle}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {/* Image container with overlay */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0'
        }}>
          <img
            src={product.featuredImage?.url || '/placeholder-product.jpg'}
            alt={product.featuredImage?.altText || product.title}
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
          
          {/* Sale badge */}
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--gradient-secondary)',
              color: 'var(--color-white)',
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              boxShadow: 'var(--shadow)'
            }}>
              خصم {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
            </div>
          )}

          {/* Availability badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: isAvailable ? 'var(--color-success)' : 'var(--color-error)',
            color: 'var(--color-white)',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow)'
          }}>
            {isAvailable ? 'متوفر' : 'نفذت الكمية'}
          </div>

          {/* Quick view overlay */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            padding: '2rem 1rem 1rem',
            transform: 'translateY(100%)',
            transition: 'transform 0.3s ease',
            color: 'var(--color-white)',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(0)';
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              👁️ عرض سريع
            </span>
          </div>
        </div>

        {/* Product info */}
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{
            color: 'var(--color-primary)',
            fontWeight: 700,
            fontSize: '1.1rem',
            margin: '0 0 0.8rem',
            lineHeight: '1.4',
            fontFamily: 'var(--font-heading)',
            minHeight: '2.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.title}
          </h3>
          
          {/* Price section */}
          <div style={{ marginBottom: '1rem' }}>
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
              <div style={{
                color: 'var(--color-gray)',
                fontSize: '0.9rem',
                textDecoration: 'line-through',
                marginBottom: '0.3rem'
              }}>
                {Number(product.compareAtPrice).toLocaleString('ar-KW', { 
                  style: 'currency', 
                  currency: product.currency || 'KWD' 
                })}
              </div>
            )}
            <div style={{
              color: 'var(--color-secondary)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              fontFamily: 'var(--font-heading)'
            }}>
              {Number(product.price).toLocaleString('ar-KW', { 
                style: 'currency', 
                currency: product.currency || 'KWD' 
              })}
            </div>
          </div>

          {/* Rating stars placeholder */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2px',
            marginBottom: '1rem',
            direction: 'ltr'
          }}>
            {[1,2,3,4,5].map(star => (
              <span 
                key={star}
                style={{
                  color: '#ffc107',
                  fontSize: '0.9rem'
                }}
              >
                ⭐
              </span>
            ))}
            <span style={{
              color: 'var(--color-gray)',
              fontSize: '0.8rem',
              marginRight: '0.5rem'
            }}>
              (4.5)
            </span>
          </div>

          {/* Add to cart button */}
          {isAvailable && (
            <button
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '0.9rem',
                padding: '0.75rem',
                marginTop: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.preventDefault();
                // Add to cart logic here
                console.log('Added to cart:', product.title);
              }}
            >
               أضف إلى عربة التسوق
            </button>
          )}
        </div>
      </Link>
    </div>
  );
}