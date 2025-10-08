// app/collections/page.js (تعديل بسيط)
import { getCollections } from "@/lib/shopify";
import Link from "next/link";

export default async function CollectionsIndex() {
  let collections = await getCollections(100);

  // Dawn: sort = "alphabetical"
  collections = collections
    .slice()
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));

  return (
    <main dir="rtl" style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>🛍️ جميع المجموعات</h1>

      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${encodeURIComponent(c.handle)}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ position: "relative", paddingBottom: "60%" }}>
              {c.image?.url ? (
                <img
                  src={c.image.url}
                  alt={c.image.altText || c.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#f6f6f6" }}>
                  📚
                </div>
              )}
            </div>
            <div style={{ padding: "1rem" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{c.title}</h3>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          main { padding: 1rem; }
          div[style*="grid-template-columns"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)); /* Dawn: 2 موبايل */
          }
        }
      `}</style>
    </main>
  );
}
// app/collections/page.js (تعديل بسيط)
import { getCollections } from "@/lib/shopify";
import Link from "next/link";

export default async function CollectionsIndex() {
  let collections = await getCollections(100);

  // Dawn: sort = "alphabetical"
  collections = collections
    .slice()
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));

  return (
    <main dir="rtl" style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>🛍️ جميع المجموعات</h1>

      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${encodeURIComponent(c.handle)}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ position: "relative", paddingBottom: "60%" }}>
              {c.image?.url ? (
                <img
                  src={c.image.url}
                  alt={c.image.altText || c.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#f6f6f6" }}>
                  📚
                </div>
              )}
            </div>
            <div style={{ padding: "1rem" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{c.title}</h3>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          main { padding: 1rem; }
          div[style*="grid-template-columns"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)); /* Dawn: 2 موبايل */
          }
        }
      `}</style>
    </main>
  );
}
