// app/ar/collections/[handle]/page.js
import Link from "next/link";
import { fetchShopifyGraphQL, formatKWD } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";

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
              variants(first: 1) { edges { node { id availableForSale } } }
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
  if (!col) {
    return <main style={{ padding: 24, direction: "rtl" }}>غير موجود.</main>;
  }

  const items = Array.isArray(col.products?.edges)
    ? col.products.edges.map((e) => e.node)
    : [];

  return (
    <main style={{ padding: 24, direction: "rtl", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>{col.title}</h1>

      {col.image?.url && (
        <img
          src={col.image.url}
          alt={col.image.altText || col.title}
          style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, margin: "12px 0" }}
        />
      )}

      {col.description && <p style={{ maxWidth: 900 }}>{col.description}</p>}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", marginTop: 16 }}>
        {items.map((p) => {
          const firstVariantId = p.variants?.edges?.[0]?.node?.id;
          const priceText = formatKWD(p.priceRange?.minVariantPrice?.amount ?? 0);
          // رابط نسبي ليرث /ar إن كانت موجودة
          const href = `products/${encodeURIComponent(p.handle)}`;

          return (
            <div
              key={p.id}
              style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}
            >
              <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
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
                <div style={{ opacity: 0.85, marginTop: 4 }}>{priceText}</div>
              </Link>

              {firstVariantId && (
                <div style={{ marginTop: 8 }}>
                  <AddToCartButton variantId={firstVariantId} goToCheckout>
                    اشترِ الآن
                  </AddToCartButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
