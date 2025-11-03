// components/FeaturedCollectionGrid.jsx
import Link from "next/link";
import { getCollectionByHandle, formatKWD } from "@/lib/shopify";

export default async function FeaturedCollectionGrid({ handle, limit = 8 }) {
  const col = await getCollectionByHandle(handle, limit);
  const products = (col?.products || []).slice(0, limit);
  if (!products.length) return null;

  return (
    <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
      <div
        style={{
          display: "grid",
          gap: "14px",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          alignItems: "stretch",
        }}
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${encodeURIComponent(p.handle)}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #eee",
              boxShadow: "0 4px 12px rgba(0,0,0,.05)",
              display: "grid",
              gridTemplateRows: "auto 1fr",
            }}
          >
            <div style={{ width: "100%", aspectRatio: "3 / 4", position: "relative", background: "#f6f7fb" }}>
              <img
                src={p.featuredImage?.url || p.images?.[0]?.url || ""}
                alt={p.featuredImage?.altText || p.title}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            </div>

            <div style={{ padding: "10px 12px", color: "#2d3748" }}>
              <div style={{ fontWeight: 700, fontSize: ".95rem", lineHeight: 1.4, marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: ".9rem", color: "#667085" }}>
                {formatKWD(p.priceRange?.minVariantPrice?.amount ?? 0)}
              </div>
            </div>
          </Link>
        ))}
      </div>
 </div>
);
}