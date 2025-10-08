"use client";
import { getProductByHandle, formatKWD } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";
import ProductVariantSelector from "@/components/ProductVariantSelector";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from 'react';

export default function ProductPage({ params }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await getProductByHandle(params.handle);
        if (!data) {
          notFound();
        }
        setProduct(data);
        setMainImage(data?.featuredImage?.url || null);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.handle]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>;
  }

  if (!product) {
    notFound();
  }

  const variants = product.variants?.edges?.map(e => e.node) ?? [];
  const firstVariant = variants[0];
  const images = product.images?.edges?.map(e => e.node) ?? [];

  return (
    <main style={{
      direction: "rtl",
      fontFamily: "'Amiri', serif",
      backgroundColor: "#f8f9fa",
      minHeight: "100vh"
    }}>
      {/* Breadcrumb */}
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "1rem 2rem",
        fontSize: "0.9rem",
        color: "#718096"
      }}>
        <Link href="/" style={{ color: "#9422af", textDecoration: "none" }}>الرئيسية</Link>
        <span style={{ margin: "0 0.5rem" }}>←</span>
        <Link href="/collections" style={{ color: "#9422af", textDecoration: "none" }}>كل المجموعات</Link>
        <span style={{ margin: "0 0.5rem" }}>←</span>
        <span>{product.title}</span>
      </div>

      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "clamp(1rem, 3vw, 2rem)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
        gap: "clamp(2rem, 5vw, 3rem)",
        alignItems: "start"
      }}>
        {/* Product Images */}
        <div style={{ position: "sticky", top: "2rem" }}>
          {/* Main Image */}
          <div style={{
            backgroundColor: "white",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: "1.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            position: "relative"
          }}>
            <div style={{ position: "relative", paddingBottom: "100%" }}>
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.featuredImage?.altText || product.title}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "4rem"
                }}>
                  🎁
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(clamp(60px, 15vw, 80px), 1fr))",
              gap: "0.75rem"
            }}>
              {images.map((image, index) => (
                <button
                  type="button"
                  key={index}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 12,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "2px solid " + (mainImage === image.url ? "#9422af" : "transparent"),
                    padding: 0
                  }}
                  onClick={() => setMainImage(image.url)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <div style={{ position: "relative", paddingBottom: "100%" }}>
                    <img
                      src={image.url}
                      alt={image.altText || `${product.title} ${index + 1}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <div style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: "clamp(1.5rem, 4vw, 2rem)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: "1.5rem"
          }}>
            {/* Product Title */}
            <h1 style={{
              fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
              fontWeight: 700,
              color: "#2d3748",
              marginBottom: "1rem",
              lineHeight: "1.3"
            }}>
              {product.title}
            </h1>

            {/* Price */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{
                fontSize: "clamp(1.6rem, 4vw, 2rem)",
                fontWeight: 700,
                color: "#9422af",
                marginBottom: "0.5rem"
              }}>
                {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
              </div>
              {product.compareAtPriceRange?.minVariantPrice?.amount && (
                <div style={{
                  fontSize: "clamp(1.1rem, 3vw, 1.3rem)",
                  color: "#718096",
                  textDecoration: "line-through"
                }}>
                  {formatKWD(product.compareAtPriceRange.minVariantPrice.amount)}
                </div>
              )}
            </div>

            {/* Availability Status */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              padding: "0.75rem 1rem",
              backgroundColor: product.availableForSale ? "#d4edda" : "#f8d7da",
              borderRadius: 8,
              color: product.availableForSale ? "#155724" : "#721c24"
            }}>
              <span style={{ fontSize: "1.2rem" }}>
                {product.availableForSale ? "✅" : "❌"}
              </span>
              <span style={{ fontWeight: 600 }}>
                {product.availableForSale ? "متوفر في المخزون" : "نفذت الكميةغير متوفر حالياً"}
              </span>
            </div>

            {/* Variant Selector */}
            {variants.length > 1 && (
              <div style={{ marginBottom: "2rem" }}>
                <ProductVariantSelector 
                  variants={variants}
                  selectedVariant={firstVariant}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "2rem",
              flexWrap: "wrap"
            }}>
              {firstVariant?.id && product.availableForSale ? (
                <>
                  <AddToCartButton 
                    variantId={firstVariant.id}
                    style={{
                      flex: 1,
                      minWidth: "min(200px, 100%)",
                      padding: "clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)",
                      backgroundColor: "#9422af",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem"
                    }}
                  >
                    🛒 أضف إلى السلة
                  </AddToCartButton>
                  <AddToCartButton 
                    variantId={firstVariant.id} 
                    goToCheckout
                    style={{
                      flex: 1,
                      minWidth: "min(200px, 100%)",
                      padding: "clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)",
                      backgroundColor: "#e74c3c",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem"
                    }}
                  >
                    ⚡ اشتري الآن
                  </AddToCartButton>
                </>
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "1rem 2rem",
                    backgroundColor: "#e2e8f0",
                    color: "#718096",
                    border: "none",
                    borderRadius: 12,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    cursor: "not-allowed"
                  }}
                >
                  غير متوفر حالياً
                </button>
              )}
              
              <div style={{ display: "flex", alignItems: "center" }}>
                <WishlistButton productId={product.id} size="large" />
              </div>
            </div>

            {/* Product Features */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🚚</div>
                <div style={{ fontWeight: 600, color: "#2d3748" }}>توصيل سريع</div>
                <div style={{ fontSize: "0.9rem", color: "#718096" }}>خلال 24-48 ساعة</div>
              </div>
              <div style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>💯</div>
                <div style={{ fontWeight: 600, color: "#2d3748" }}>ضمان الجودة</div>
                <div style={{ fontSize: "0.9rem", color: "#718096" }}>منتجات أصلية</div>
              </div>
              <div style={{
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔄</div>
                <div style={{ fontWeight: 600, color: "#2d3748" }}>سهولة الإرجاع</div>
                <div style={{ fontSize: "0.9rem", color: "#718096" }}>خلال 7 أيام</div>
              </div>
            </div>
          </div>

          {/* Product Description */}
          {product.descriptionHtml && (
            <div style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#2d3748",
                marginBottom: "1.5rem",
                borderBottom: "2px solid #9422af",
                paddingBottom: "0.5rem"
              }}>
                📝 وصف المنتج
              </h2>
              <div 
                style={{
                  lineHeight: "1.8",
                  color: "#4a5568",
                  fontSize: "1.1rem"
                }}
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} 
              />
            </div>
          )}
        </div>
      </div>
  </main>
);
}