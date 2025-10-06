import Link from "next/link";
import { getCollections, getProducts, formatKWD } from "@/lib/shopify";

export default async function HomePage() {
  // جلب البيانات من Shopify
  const collections = await getCollections();
  const products = await getProducts();

  const heroSlides = [
    {
      image: "//smart-kids.me/cdn/shop/files/slides-banners-home-3-mobile.png?v=1726066734&width=1200",
      title: "مجموعة ألعاب تعليمية متنوعة",
      subtitle: "تطوير مهارات طفلك بطريقة ممتعة وتفاعلية"
    },
    {
      image: "//smart-kids.me/cdn/shop/files/slides-banners-home-2-mobile.png?v=1726066734&width=1200", 
      title: "قصص تفاعلية للأطفال",
      subtitle: "عالم من المغامرات والتعلم"
    },
    {
      image: "//smart-kids.me/cdn/shop/files/slides-banners-home-1-mobile.png?v=1726066734&width=1200",
      title: "ألعاب ذكية وتعليمية",
      subtitle: "استكشف مجموعتنا الحصرية"
    }
  ];

  return (
    <main style={{
      direction: "rtl",
      fontFamily: "'Amiri', serif"
    }}>
      {/* Hero Slider */}
      <section style={{
        position: "relative",
        marginBottom: "3rem"
      }}>
        <div style={{
          position: "relative",
          height: "60vh",
          minHeight: "400px",
          background: `linear-gradient(135deg, rgba(148, 34, 175, 0.8) 0%, rgba(124, 29, 138, 0.8) 100%), url(${heroSlides[0].image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "800px",
            padding: "2rem"
          }}>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
            }}>
              {heroSlides[0].title}
            </h1>
            <p style={{
              fontSize: "clamp(1.1rem, 3vw, 1.5rem)",
              marginBottom: "2rem",
              opacity: 0.95,
              textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
            }}>
              {heroSlides[0].subtitle}
            </p>
            <Link
              href="/collections"
              style={{
                display: "inline-block",
                padding: "1rem 2.5rem",
                backgroundColor: "white",
                color: "#9422af",
                textDecoration: "none",
                borderRadius: 50,
                fontSize: "1.2rem",
                fontWeight: 600,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 20px rgba(255,255,255,0.3)"
              }}
            >
              🛍️ تسوق الآن
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "3rem 2rem"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "3rem"
        }}>
          <h2 style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "1rem"
          }}>
            🎯 تصفح حسب الفئة
          </h2>
          <p style={{
            fontSize: "1.2rem",
            color: "#718096",
            maxWidth: "600px",
            margin: "0 auto"
          }}>
            اكتشف مجموعاتنا المتنوعة من الألعاب التعليمية والقصص التفاعلية
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
          marginBottom: "4rem"
        }}>
          {collections.slice(0, 6).map((collection, index) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              style={{
                textDecoration: "none",
                color: "inherit"
              }}
            >
              <div style={{
                backgroundColor: "white",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                transition: "all 0.3s ease",
                border: "1px solid rgba(148, 34, 175, 0.08)"
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
                <div style={{
                  position: "relative",
                  paddingBottom: "60%",
                  overflow: "hidden"
                }}>
                  {collection.image?.url ? (
                    <img
                      src={collection.image.url}
                      alt={collection.title}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease"
                      }}
                    />
                  ) : (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background: `linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "4rem"
                    }}>
                      🎁
                    </div>
                  )}
                </div>
                <div style={{
                  padding: "1.5rem"
                }}>
                  <h3 style={{
                    fontSize: "1.3rem",
                    fontWeight: 600,
                    color: "#2d3748",
                    marginBottom: "0.5rem"
                  }}>
                    {collection.title}
                  </h3>
                  {collection.description && (
                    <p style={{
                      fontSize: "0.95rem",
                      color: "#718096",
                      lineHeight: "1.5",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{
        backgroundColor: "#f8f9fa",
        padding: "4rem 2rem"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto"
        }}>
          <div style={{
            textAlign: "center",
            marginBottom: "3rem"
          }}>
            <h2 style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              color: "#2d3748",
              marginBottom: "1rem"
            }}>
              ⭐ المنتجات المميزة
            </h2>
            <p style={{
              fontSize: "1.2rem",
              color: "#718096",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              أفضل اختياراتنا من الألعاب التعليمية والقصص التفاعلية
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "2rem"
          }}>
            {products.slice(0, 8).map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.handle}`}
                style={{
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  transition: "all 0.3s ease",
                  border: "1px solid rgba(148, 34, 175, 0.08)"
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
                  <div style={{
                    position: "relative",
                    paddingBottom: "75%",
                    overflow: "hidden"
                  }}>
                    {product.featuredImage?.url ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.title}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.3s ease"
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
                        fontSize: "3rem"
                      }}>
                        🎁
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: "1.5rem"
                  }}>
                    <h3 style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: "#2d3748",
                      marginBottom: "0.75rem",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {product.title}
                    </h3>
                    <div style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: "#9422af"
                    }}>
                      {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{
            textAlign: "center",
            marginTop: "3rem"
          }}>
            <Link
              href="/collections"
              style={{
                display: "inline-block",
                padding: "1rem 2.5rem",
                backgroundColor: "#9422af",
                color: "white",
                textDecoration: "none",
                borderRadius: 50,
                fontSize: "1.2rem",
                fontWeight: 600,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 20px rgba(148, 34, 175, 0.3)"
              }}
            >
              🛍️ عرض جميع المنتجات
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "4rem 2rem"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "3rem"
        }}>
          <h2 style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "1rem"
          }}>
            ✨ لماذا تختار Smart Kids؟
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2rem"
        }}>
          {[
            {
              icon: "🚚",
              title: "توصيل سريع",
              desc: "توصيل خلال 24-48 ساعة لجميع محافظات الكويت"
            },
            {
              icon: "💯",
              title: "ضمان الجودة",
              desc: "منتجات أصلية ومضمونة من أفضل الماركات العالمية"
            },
            {
              icon: "🎓",
              title: "تعليمي وممتع",
              desc: "ألعاب تجمع بين التعلم والمتعة لتنمية مهارات طفلك"
            },
            {
              icon: "🔄",
              title: "سهولة الإرجاع",
              desc: "إمكانية الإرجاع والاستبدال خلال 7 أيام"
            }
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: 16,
                textAlign: "center",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                border: "1px solid rgba(148, 34, 175, 0.05)"
              }}
            >
              <div style={{
                fontSize: "3rem",
                marginBottom: "1rem"
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "#2d3748",
                marginBottom: "0.75rem"
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: "#718096",
                lineHeight: "1.6"
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
