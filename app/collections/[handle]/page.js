// app/ar/collections/page.js
import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function CollectionsIndex() {
  const QUERY = /* GraphQL */ `
    query Collections($language: LanguageCode!, $first: Int = 24) @inContext(language: $language) {
      collections(first: $first) {
        edges { node { handle title image { url altText } } }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR", first: 24 });
  const items = data?.collections?.edges?.map(e => e.node) ?? [];

  return (
    <main style={{ padding: 24, direction: "rtl" }}>
      <h1>المجموعات</h1>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {items.map(c => (
          <a
            key={c.handle}
            href={`/ar/collections/${c.handle}`}
            style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 12, padding: 12 }}
          >
            {c.image?.url ? (
              <img
                src={c.image.url}
                alt={c.image.altText || c.title}
                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: "100%", height: 160, background: "#f3f4f6", borderRadius: 8 }} />
            )}
            <div style={{ marginTop: 8, fontWeight: 600 }}>{c.title}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
