import { fetchShopifyGraphQL } from "@/lib/shopify";
const mapKey = (k) => ({
  "privacy-policy":"privacyPolicy",
  "refund-policy":"refundPolicy",
  "terms-of-service":"termsOfService",
  "shipping-policy":"shippingPolicy",
  "contact-information":"contactInformation",
}[k]);

export default async function Policy({ params }) {
  const QUERY = /* GraphQL */ `
    query Policies($language: LanguageCode!) @inContext(language: $language) {
      shop {
        privacyPolicy { title body }
        refundPolicy { title body }
        termsOfService { title body }
        shippingPolicy { title body }
        contactInformation { title body }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "EN" });
  const key = mapKey(params.policy);
  const p = data?.shop?.[key];
  if (!p) return <main style={{padding:24}}>Not found.</main>;
  return (
    <main style={{ padding:24, maxWidth:900, margin:"0 auto" }}>
      <h1>{p.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: p.body }} />
    </main>
  );
}
