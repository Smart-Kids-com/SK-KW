import { getCollectionByHandle } from "@/lib/shopify";
import { formatKWD } from "@/lib/shopify";
import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";
import { notFound } from "next/navigation";

function AddFromCollectionButton({ product }) {
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
          // اختياري: إعادة توجيه للسلة
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

export default async function CollectionPage({ params }) {
  const { handle } = params;
  const collection = await getCollectionByHandle(handle);

  if (!collection) {
    notFound();
  }

  return (
    <main style={{ 
      maxWidth: 1400, 
      margin: "0 auto", 
      padding: "2rem 1rem", 
      direction: "rtl",
      fontFamily: "'Amiri', serif"
    }}>
      {/* Collection Header */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "3rem",
        padding: "3rem 2rem",
        background: `linear-gradient(135deg, rgba(148, 34, 175, 0.9) 0%, rgba(124, 29, 138, 0.9) 100%), ${collection.image?.url ? `url(${collection.image.url})` : 'linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)'}`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        borderRadius: 16
      }}>
        <h1 style={{ 
          fontSize: "3rem", 
          marginBottom: "1rem",
          fontWeight: 700,
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
        }}>
          {collection.title}
        </h1>
        {collection.description && (
          <p style={{ 
            fontSize: "1.3rem", 
            opacity: 0.95,
            maxWidth: 800,
            margin: "0 auto",
            lineHeight: "1.6",
            textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
          }}>
            {collection.description}
          </p>
        )}
        <div style={{
          marginTop: "1.5rem",
          fontSize: "1.1rem",
          opacity: 0.9
        }}>
          📦 {collection.products.length} المنتج متوفر
        </div>
      </div>

      {/* Products Grid */}
      {collection.products.length > 0 ? (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem"
        }}>
          {collection.products.map(product => (
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
              {/* Wishlist Button */}
              <div style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                zIndex: 10
              }}>
                <WishlistButton productId={product.id} size="medium" />
              </div>

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
                        e.target.style.transform = "scale(1.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "scale(1)";
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
                      fontSize: "3rem",
                      color: "#9422af"
                    }}>
                      🎁
                    </div>
                  )}

                  {/* Sale Badge */}
                  {product.priceRange?.minVariantPrice?.amount !== product.priceRange?.maxVariantPrice?.amount && (
                    <div style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      backgroundColor: "#e74c3c",
                      color: "white",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 20,
                      fontSize: "0.8rem",
                      fontWeight: 600
                    }}>
                      عرض خاص
                    </div>
                  )}
                </div>
              </Link>

              {/* Product Info */}
              <div style={{ padding: "1.5rem" }}>
                <Link 
                  href={`/products/${product.handle}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <h3 style={{ 
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "0.75rem",
                    color: "#2d3748",
                    lineHeight: "1.4",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: "2.8rem"
                  }}>
                    {product.title}
                  </h3>
                </Link>

                {/* Price */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ 
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#9422af",
                    marginBottom: "0.25rem"
                  }}>
                    {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
                  </div>
                  {product.priceRange?.minVariantPrice?.amount !== product.priceRange?.maxVariantPrice?.amount && (
                    <div style={{
                      fontSize: "1rem",
                      color: "#718096",
                      textDecoration: "line-through"
                    }}>
                      {formatKWD(product.priceRange?.maxVariantPrice?.amount || 0)}
                    </div>
                  )}
                </div>

                {/* Add / View Button */}
                <AddFromCollectionButton product={product} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div style={{ 
          textAlign: "center", 
          padding: "4rem 2rem",
          backgroundColor: "#f8f9fa",
          borderRadius: 16,
          color: "#718096"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📦</div>
          <h2 style={{ color: "#2d3748", marginBottom: "1rem" }}>المجموعة تحت الإنشاء</h2>
          <p>نعمل على إضافة منتجات جديدة </p>
          <Link 
            href="/collections"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.75rem 2rem",
              backgroundColor: "#9422af",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 600
            }}
          >
            عرض المجموعات الأخرى
          </Link>
        </div>
      )}
  </main>
);
}