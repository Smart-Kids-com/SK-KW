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
        privacyPolicy { title body } سياسة الخصوصية
        refundPolicy { title body } سياسة الاسترجاع والاستبدال
        termsOfService { title body } شروط الخدمة
        shippingPolicy { title body } سياسة الشحن
        contactInformation { title body } معلومات التواصل
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR" });
  const key = mapKey(params.policy);
  const p = data?.shop?.[key];
  if (!p) return <main style={{padding:24, direction:"rtl"}}>غير موجود.</main>;
  return (
    <main style={{ padding:24, maxWidth:900, margin:"0 auto", direction:"rtl" }}>
      <h1>{p.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: p.body }} />
    </main>
  );
}
