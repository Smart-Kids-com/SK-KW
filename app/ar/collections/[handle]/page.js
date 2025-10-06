// app/ar/collections/[handle]/page.js
import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function CollectionPage({ params }) {
  const QUERY = /* GraphQL */ `
    query CollectionByHandle($language: LanguageCode!, $handle: String!, $first: Int = 24)
    @inContext(language: $language) {
      collection(handle: $handle) {
        title
        description
        image { url altText }
        products(first: $first) {
          edges {
            node {
              id
              handle
              title
              featuredImage { url altText }
              priceRange { minVariantPrice { amount currencyCode } }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const data = await fetchShopifyGraphQL(QUERY, {
    language: "AR",
    handle: params.handle,
    first: 24,
  });

  const col = data?.collection;
  if (!col) return <main style={{ padding: 24, direction: "rtl" }}>غير موجود.</main>;

  const items = col.products?.edges?.map((e) => e.node) ?? [];

  return (
    <main style={{ padding: 24, direction: "rtl", maxWidth: 1100, margin: "0 auto" }}>
      <h1>{col.title}</h1>

      {col.image?.url && (
        <img
          src={col.image.url}
          alt={col.image.altText || col.title}
          style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, margin: "12px 0" }}
        />
      )}

      {col.description && <p style={{ maxWidth: 900 }}>{col.description}</p>}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", marginTop: 16 }}>
        {items.map((p) => (
          <a
            key={p.id}
            href={`/ar/products/${p.handle}`}
            style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 12, padding: 12 }}
          >
            {p.featuredImage?.url ? (
              <img
                src={p.featuredImage.url}
                alt={p.featuredImage.altText || p.title}
                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: "100%", height: 160, background: "#f3f4f6", borderRadius: 8 }} />
            )}
            <div style={{ marginTop: 8, fontWeight: 600 }}>{p.title}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {p.priceRange?.minVariantPrice?.amount} {p.priceRange?.minVariantPrice?.currencyCode}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
