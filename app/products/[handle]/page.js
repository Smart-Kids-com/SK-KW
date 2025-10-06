// app/products/[handle]/page.js
import { fetchShopifyGraphQL } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";

export default async function ProductPage({ params }) {
  const QUERY = /* GraphQL */ `
    query ProductByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      product(handle: $handle) {
        id
        handle
        title
        descriptionHtml
        availableForSale
        featuredImage { url altText }
        images(first: 8) { edges { node { url altText } } }
        variants(first: 20) { edges { node { id title availableForSale } } }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  `;

  const data = await fetchShopifyGraphQL(QUERY, { language: "EN", handle: params.handle });
  const p = data?.product;
  if (!p) return <main style={{ padding: 24 }}>Not found.</main>;

  const variants = p.variants?.edges?.map(e => e.node) ?? [];
  const firstVariant = variants[0];

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>{p.title}</h1>

      {p.featuredImage?.url && (
        <img
          src={p.featuredImage.url}
          alt={p.featuredImage.altText || p.title}
          style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, margin: "12px 0" }}
        />
      )}

      <div style={{ margin: "8px 0", fontWeight: 600 }}>
        {p.priceRange?.minVariantPrice?.amount} {p.priceRange?.minVariantPrice?.currencyCode}
      </div>

      <article dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />

      {firstVariant?.id ? (
        <div style={{ marginTop: 16 }}>
          {p.availableForSale ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <AddToCartButton variantId={firstVariant.id}>
                Add to Cart
              </AddToCartButton>
              <AddToCartButton variantId={firstVariant.id} goToCheckout>
                Buy Now
              </AddToCartButton>
            </div>
          ) : (
            <div style={{ marginTop: 8, opacity: 0.7 }}>Currently unavailable</div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 16, opacity: 0.7 }}>No variants available</div>
      )}

      {/* Optional extra images grid */}
      {p.images?.edges?.length > 1 && (
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            marginTop: 24,
          }}
        >
          {p.images.edges.map((img, i) => (
            <img
              key={i}
              src={img.node.url}
              alt={img.node.altText || `${p.title} ${i + 1}`}
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
