import { getCollections } from "@/lib/shopify";
import Link from "next/link";

export default async function CollectionsIndex() {
  const collections = await getCollections(24);

  return (
    <main style={{ 
      maxWidth: 1400, 
      margin: "0 auto", 
      padding: "2rem 1rem", 
      direction: "rtl",
      fontFamily: "'Amiri', serif"
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: "center", 
        marginBottom: "3rem",
        padding: "2rem",
        background: "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
        color: "white",
        borderRadius: 16
      }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          marginBottom: "1rem",
          fontWeight: 700
        }}>
          🛍️ جميع المجموعات
        </h1>
        <p style={{ 
          fontSize: "1.2rem", 
          opacity: 0.9,
          maxWidth: 600,
          margin: "0 auto"
        }}>
          اكتشف مجموعاتنا المتنوعة من المنتجات التعليمية والألعاب الذكية
        </p>
      </div>

      {/* Collections Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "2rem",
        marginBottom: "3rem"
      }}>
        {collections.map(collection => (
          <Link
            key={collection.handle}
            href={`/collections/${collection.handle}`}
            style={{ 
              textDecoration: "none", 
              color: "inherit",
              display: "block",
              backgroundColor: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              transition: "all 0.3s ease",
              border: "1px solid rgba(148, 34, 175, 0.1)"
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
            {/* Collection Image */}
            <div style={{ 
              position: "relative", 
              paddingBottom: "60%", 
              overflow: "hidden",
              backgroundColor: "#f8f9fa"
            }}>
              {collection.image?.url ? (
                <img
                  src={collection.image.url}
                  alt={collection.image.altText || collection.title}
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
                    e.target.style.transform = "scale(1.05)";
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
                  📚
                </div>
              )}
              
              {/* Overlay */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                height: "40%"
              }} />
            </div>

            {/* Collection Info */}
            <div style={{ padding: "1.5rem" }}>
              <h3 style={{ 
                fontSize: "1.4rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: "#2d3748",
                lineHeight: "1.3"
              }}>
                {collection.title}
              </h3>
              
              {collection.description && (
                <p style={{ 
                  fontSize: "1rem",
                  color: "#718096",
                  lineHeight: "1.5",
                  marginBottom: "1rem",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {collection.description}
                </p>
              )}

              {/* View Collection Button */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "1rem"
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#9422af",
                  fontWeight: 600,
                  fontSize: "1rem"
                }}>
                  عرض المجموعة
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <div style={{ 
          textAlign: "center", 
          padding: "4rem 2rem",
          backgroundColor: "#f8f9fa",
          borderRadius: 16,
          color: "#718096"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📦</div>
          <h2 style={{ color: "#2d3748", marginBottom: "1rem" }}>لا توجد مجموعات متاحة</h2>
          <p>نعمل على إضافة مجموعات جديدة قريباً</p>
        </div>
      )}
    </main>
  );
}
