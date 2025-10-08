// app/collections/[handle]/page.js
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionByHandle } from "@/lib/shopify";

export default async function CollectionPage({ params }) {
  // ناخد الـ handle من الرابط
  const handle = decodeURIComponent(params.handle);

  // نسحب بيانات المجموعة من Shopify
  const collection = await getCollectionByHandle(handle, 48);

  if (!collection) return notFound();

  const products = collection.products || [];

  return (
    <main
      style={{
        direction: "rtl",
        fontFamily: "'Amiri', serif",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(148,34,175,.9) 0%, rgba(124,29,138,.9) 100%)",
          color: "#fff",
          padding: "3rem 2rem",
          textAlign: "center",
          marginBottom: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2rem,4vw,3rem)",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          {collection.title}
        </h1>
        {collection.descriptionHtml && (
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              opacity: 0.95,
              lineHeight: 1.7,
            }}
            dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
          />
        )}
      </div>

      {/* Products Grid */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 2rem 4rem" }}>
        {products.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(260px,100%),1fr))",
              gap: "1.5rem",
            }}
          >
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${encodeURIComponent(p.handle)}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
                    border: "1px solid rgba(148,34,175,.08)",
                    transition: "transform .2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "70%",
                      background: "#f7f7fb",
                    }}
                  >
                    {p.featuredImage?.url ? (
                      <img
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText || p.title}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "3rem",
                        }}
                      >
                        📘
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "1rem 1rem 1.25rem" }}>
                    <h3
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#2d3748",
                        lineHeight: 1.5,
                      }}
                    >
                      {p.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#718096" }}>
            لا توجد منتجات في هذه المجموعة حالياً.
          </p>
        )}
      </div>
    </main>
  );
}
