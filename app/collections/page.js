"use client";
import { getCollections } from "@/lib/shopify";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CollectionsIndex() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const data = await getCollections();
        setCollections(data);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCollections();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>;
  }

  return (
    <main style={{
      direction: "rtl",
      fontFamily: "'Amiri', serif",
      backgroundColor: "#f8f9fa",
      minHeight: "100vh"
    }}>
      {/* Header Section */}
      <div style={{ 
        background: `linear-gradient(135deg, rgba(148, 34, 175, 0.9) 0%, rgba(124, 29, 138, 0.9) 100%)`,
        color: "white",
        padding: "4rem 2rem",
        textAlign: "center",
        marginBottom: "3rem"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          <h1 style={{ 
            fontSize: "clamp(2.5rem, 5vw, 4rem)", 
            marginBottom: "1rem",
            fontWeight: 700,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
          }}>
            🛍️ جميع المجموعات
          </h1>
          <p style={{ 
            fontSize: "clamp(1.1rem, 3vw, 1.5rem)", 
            opacity: 0.95,
            lineHeight: "1.6",
            textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
          }}>
            استكشف مجموعاتنا المتنوعة من الألعاب التعليمية والقصص التفاعلية المصممة خصيصاً لتنمية مهارات طفلك
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 2rem 4rem"
      }}>
        {collections.length > 0 ? (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
            gap: "2.5rem"
          }}>
            {collections.map(collection => (
              <Link
                key={collection.id}
                href={`/collections/${collection.handle}`}
                style={{
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(148, 34, 175, 0.08)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column"
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
                        background: "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "4rem",
                        color: "white"
                      }}>
                        🎁
                      </div>
                    )}

                    {/* Collection Badge */}
                    <div style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      color: "#9422af",
                      padding: "0.4rem 0.8rem",
                      borderRadius: 20,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backdropFilter: "blur(10px)"
                    }}>
                      مجموعة
                    </div>
                  </div>

                  {/* Collection Info */}
                  <div style={{ 
                    padding: "1.5rem",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column"
                  }}>
                    <h2 style={{ 
                      fontSize: "1.4rem",
                      fontWeight: 600,
                      marginBottom: "0.75rem",
                      color: "#2d3748",
                      lineHeight: "1.4"
                    }}>
                      {collection.title}
                    </h2>
                    
                    {collection.description && (
                      <p style={{
                        fontSize: "1rem",
                        color: "#718096",
                        lineHeight: "1.6",
                        marginBottom: "1.5rem",
                        flex: 1,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {collection.description}
                      </p>
                    )}

                    {/* View Collection Button */}
                    <div style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#9422af",
                      color: "white",
                      borderRadius: 12,
                      fontSize: "1rem",
                      fontWeight: 600,
                      textAlign: "center",
                      transition: "all 0.2s ease",
                      marginTop: "auto"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#7c1d8a";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#9422af";
                      e.target.style.transform = "translateY(0)";
                    }}
                    >
                      🔍 استكشف المجموعة
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div style={{ 
            textAlign: "center", 
            padding: "4rem 2rem",
            backgroundColor: "white",
            borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📦</div>
            <h2 style={{ 
              color: "#2d3748", 
              marginBottom: "1rem",
              fontSize: "1.8rem"
            }}>
              لا توجد مجموعات متاحة حالياً
            </h2>
            <p style={{ 
              color: "#718096",
              fontSize: "1.1rem",
              marginBottom: "2rem"
            }}>
              نعمل على إضافة مجموعات جديدة قريباً
            </p>
            <Link 
              href="/"
              style={{
                display: "inline-block",
                padding: "1rem 2rem",
                backgroundColor: "#9422af",
                color: "white",
                textDecoration: "none",
                borderRadius: 12,
                fontSize: "1.1rem",
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              🏠 العودة للرئيسية
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          main {
            padding: 0;
          }
          
          .collections-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            padding: 0 1rem;
          }
          
          h1 {
            font-size: 2.5rem !important;
          }
          
          p {
            font-size: 1.1rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .collections-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </main>
  );
}
