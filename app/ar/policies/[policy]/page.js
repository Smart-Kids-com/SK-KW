import { fetchShopifyGraphQL } from "@/lib/shopify";

const mapKey = (k) => ({
  "/page/privacy-policy": { body: "privacyPolicyBody", handle: "privacyPolicyHandle", title: "privacyPolicyTitle" },
  "/policies/refund-policy": { body: "policies/refundPolicyBody", handle: "policies/refund-policy", title: "refundPolicy" },
  "/page/terms-of-service": { body: "termsOfServiceBody", handle: "termsOfServiceHandle", title: "termsOfServiceTitle" },
  "/page/shipping-policy": { body: "shippingPolicyBody", handle: "shippingPolicyHandle", title: "shippingPolicyTitle" },
  "/page/contact-information": { body: "contactInformationBody", handle: "contactInformationHandle", title: "contactInformationTitle" },
}[k]);

export default async function Policy({ params }) {
  const QUERY = /* GraphQL */ `
    query Policies($language: LanguageCode!) @inContext(language: $language) {
      shop {
        privacy-policy { title body } سياسة الخصوصية
        refund-policy { title body } سياسة الاسترجاع والاستبدال
        terms-of-service { title body } شروط الخدمة
        shipping-policy { title body } سياسة الشحن
        contact-information { title body } معلومات التواصل
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
