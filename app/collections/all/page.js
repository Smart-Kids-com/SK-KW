'use client';

import { useState, useEffect } from 'react';
import { getProducts } from "@/lib/shopify";
import { formatKWD } from "@/lib/shopify";
import Link from "next/link";

function AddToCartButton({ product }) {
  const variants = product?.variants?.edges?.map(e => e.node) ?? [];
  const singleVariantId = variants.length === 1 ? variants[0]?.id : null;

  if (!singleVariantId) {
    return (
      <Link
        href={`/products/${product.handle}`}
        style={{
          display: "inline-block",
          width: "100%",
          padding: "0.75rem 1rem",
          backgroundColor: "#9422af",
          color: "white",
          textDecoration: "none",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 600,
          textAlign: "center"
        }}
      >
        عرض المنتج
      </Link>
    );
  }

  return (
    <form
      action="/api/cart"
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await fetch("/api/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "add",
              lines: [{ merchandiseId: singleVariantId, quantity: 1 }]
            }),
          });
          window.location.href = "/cart";
        } catch (err) {
          console.error(err);
        }
      }}
      style={{ width: "100%" }}
    >
      <button
        type="submit"
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          backgroundColor: "#9422af",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#7c1d8a";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#9422af";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        🛒 أضف إلى عربة التسوق 
      </button>
    </form>
  );
}

export default function AllProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const allProducts = await getProducts(100);
        setProducts(allProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        direction: 'rtl',
        fontFamily: "'Amiri', serif"
      }}>
        <div>جاري تحميل المنتجات...</div>
      </div>
    );
  }

  return (
    <main style={{ 
      maxWidth: 1400, 
      margin: "0 auto", 
      padding: "2rem 1rem", 
      direction: "rtl",
      fontFamily: "'Amiri', serif"
    }}>
      {/* Page Header */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "3rem",
        padding: "3rem 2rem",
        background: `linear-gradient(135deg, rgba(148, 34, 175, 0.9) 0%, rgba(124, 29, 138, 0.9) 100%)`,
        color: "white",
        borderRadius: 16
      }}>
        <h1 style={{ 
          fontSize: "3rem", 
          marginBottom: "1rem",
          fontWeight: 700,
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
        }}>
          جميع المنتجات
        </h1>
        <p style={{ 
          fontSize: "1.3rem", 
          opacity: 0.95,
          maxWidth: 800,
          margin: "0 auto",
          lineHeight: "1.6",
          textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
        }}>
          اكتشف مجموعتنا الكاملة من الكتب التفاعلية والتعليمية للأطفال
        </p>
        <div style={{
          marginTop: "1.5rem",
          fontSize: "1.1rem",
          opacity: 0.9
        }}>
          📦 {products.length} منتج متوفر
        </div>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem"
        }}>
          {products.map(product => (
            <div
              key={product.id}
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                transition: "all 0.3s ease",
                border: "1px solid rgba(148, 34, 175, 0.08)",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(148, 34, 175, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
              }}
            >
              {/* Product Image */}
              <Link href={`/products/${product.handle}`}>
                <div style={{ 
                  position: "relative", 
                  paddingBottom: "75%", 
                  overflow: "hidden",
                  backgroundColor: "#f8f9fa",
                  cursor: "pointer"
                }}>
                  {product.featuredImage?.url ? (
                    <img
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText || product.title}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  ) : (
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "#6b7280",
                      fontSize: "3rem"
                    }}>
                      📚
                    </div>
                  )}
                </div>
              </Link>

              {/* Product Info */}
              <div style={{ padding: "1.5rem" }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                  color: "#1f2937",
                  lineHeight: "1.4",
                  height: "2.8rem",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical"
                }}>
                  <Link 
                    href={`/products/${product.handle}`}
                    style={{ 
                      textDecoration: "none", 
                      color: "inherit",
                      transition: "color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#9422af"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#1f2937"}
                  >
                    {product.title}
                  </Link>
                </h3>
                
                {/* Price */}
                <div style={{ 
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap"
                }}>
                  {product.priceRange?.minVariantPrice && (
                    <>
                      <span style={{ 
                        fontSize: "1.5rem", 
                        fontWeight: 700,
                        color: "#9422af"
                      }}>
                        {formatKWD(product.priceRange.minVariantPrice.amount)}
                      </span>
                      {product.compareAtPriceRange?.minVariantPrice?.amount && 
                       parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
                        <span style={{ 
                          fontSize: "1rem",
                          color: "#6b7280",
                          textDecoration: "line-through"
                        }}>
                          {formatKWD(product.compareAtPriceRange.minVariantPrice.amount)}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Add to Cart Button */}
                <AddToCartButton product={product} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          textAlign: "center", 
          padding: "4rem 2rem",
          color: "#6b7280"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📚</div>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>لا توجد منتجات</h3>
          <p>لم يتم العثور على أي منتجات في الوقت الحالي.</p>
        </div>
      )}

      {/* Back to Collections */}
      <div style={{ 
        textAlign: "center", 
        marginTop: "3rem",
        padding: "2rem"
      }}>
        <Link 
          href="/collections"
          style={{
            display: "inline-block",
            padding: "1rem 2rem",
            backgroundColor: "white",
            border: "2px solid #9422af",
            color: "#9422af",
            textDecoration: "none",
            borderRadius: 12,
            fontSize: "1.1rem",
            fontWeight: 600,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#9422af";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = "#9422af";
          }}
        >
          🏷️ تصفح المجموعات
        </Link>
      </div>
    </main>
  );
}