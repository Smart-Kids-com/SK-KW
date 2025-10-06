"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getWishlist, removeFromWishlist, getProductsByIds } from "@/lib/shopify";
import { formatKWD } from "@/lib/shopify";

export default function WishlistPage() {
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const wishlistIds = getWishlist();
      if (wishlistIds.length === 0) {
        setLoading(false);
        return;
      }

      // تحويل IDs إلى Shopify Global IDs
      const globalIds = wishlistIds.map(id => `gid://shopify/Product/${id}`);
      const products = await getProductsByIds(globalIds);
      setWishlistProducts(products);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = (productId) => {
    // استخراج ID من Global ID
    const id = productId.split('/').pop();
    removeFromWishlist(id);
    setWishlistProducts(prev => prev.filter(product => product.id !== productId));
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div>جاري تحميل المفضلة...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ color: "#9422af", marginBottom: "2rem", textAlign: "center" }}>
        قائمة المفضلة ❤️
      </h1>

      {wishlistProducts.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "4rem 2rem",
          backgroundColor: "#f8f9fa",
          borderRadius: 12,
          color: "#666"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💔</div>
          <h2 style={{ marginBottom: "1rem", color: "#333" }}>قائمة المفضلة فارغة</h2>
          <p style={{ marginBottom: "2rem", fontSize: "1.1rem" }}>
            لم تقم بإضافة أي منتجات إلى المفضلة بعد
          </p>
          <Link 
            href="/collections"
            style={{
              display: "inline-block",
              padding: "1rem 2rem",
              backgroundColor: "#9422af",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              fontSize: "1.1rem",
              fontWeight: "600"
            }}
          >
            تسوق الآن
          </Link>
        </div>
      ) : (
        <>
          <div style={{ 
            marginBottom: "2rem", 
            textAlign: "center",
            color: "#666",
            fontSize: "1.1rem"
          }}>
            لديك {wishlistProducts.length} منتج في المفضلة
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem"
          }}>
            {wishlistProducts.map((product) => (
              <div key={product.id} style={{
                backgroundColor: "white",
                border: "1px solid #e9ecef",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              }}>
                
                {/* صورة المنتج */}
                <div style={{ position: "relative", paddingBottom: "75%", overflow: "hidden" }}>
                  {product.featuredImage && (
                    <img 
                      src={product.featuredImage.url} 
                      alt={product.featuredImage.altText || product.title}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  )}
                  
                  {/* زر الحذف */}
                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      backgroundColor: "rgba(255,255,255,0.9)",
                      border: "none",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      color: "#dc3545"
                    }}
                    title="إزالة من المفضلة"
                  >
                    ✕
                  </button>
                </div>

                {/* معلومات المنتج */}
                <div style={{ padding: "1.5rem" }}>
                  <h3 style={{ 
                    margin: "0 0 0.5rem 0",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "#333",
                    lineHeight: "1.4"
                  }}>
                    {product.title}
                  </h3>

                  <div style={{ 
                    color: "#9422af",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    marginBottom: "1rem"
                  }}>
                    {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      href={`/products/${product.handle}`}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "0.75rem",
                        backgroundColor: "#9422af",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: 6,
                        fontSize: "0.9rem",
                        fontWeight: "600"
                      }}
                    >
                      عرض المنتج
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}