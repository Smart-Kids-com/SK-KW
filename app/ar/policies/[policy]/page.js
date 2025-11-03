// app/ar/policies/[policy]/page.js
export const dynamic = "force-dynamic";

import { fetchShopifyGraphQL } from "@/lib/shopify";
import { notFound } from "next/navigation";
import { getPolicyByHandle } from "@/lib/policyByHandle";

/**
 * نطبّع باراميتر المسار ونحوّله لأحد مفاتيح شوبيفاي أو صفحة contact-information.
 */
function normalizePolicy(param = "") {
  const h = decodeURIComponent(param).toLowerCase();
  switch (h) {
    case "privacy-policy":
      return { type: "shopPolicy", field: "privacyPolicy" };
    case "refund-policy":
      return { type: "shopPolicy", field: "refundPolicy" };
    case "terms-of-service":
      return { type: "shopPolicy", field: "termsOfService" };
    case "shipping-policy":
      return { type: "shopPolicy", field: "shippingPolicy" };
    default:
      return { type: "unknown", handle: h };
  }
}

/**
 * جلب من شوبيفاي: كل سياسات المتجر + صفحة اختياريًا حسب handle
 */
async function fetchPoliciesAR(pageHandle = null) {
  const QUERY = /* GraphQL */ `
    query PoliciesAR($language: LanguageCode!, $pageHandle: String) @inContext(language: $language) {
      shop {
        privacyPolicy   { title body }
        refundPolicy    { title body }
        termsOfService  { title body }
        shippingPolicy  { title body }
      }
      pageByHandle: page(handle: $pageHandle) {
        title
        body
      }
    }
  `;
  const vars = { language: "AR", pageHandle };
  const data = await fetchShopifyGraphQL(QUERY, vars);
  return data || null;
}

export default async function ARPolicyPage({ params }) {
  const target = normalizePolicy(params?.policy);

  // يمكن تعطيل الجلب من شوبيفاي بوضع USE_SHOPIFY_POLICIES=0
  const USE_SHOPIFY = process.env.USE_SHOPIFY_POLICIES !== "0";

  let title = "";
  let body = "";

  if (USE_SHOPIFY && target.type !== "unknown") {
    try {
      const data = await fetchPoliciesAR(target.type === "page" ? target.handle : null);

      if (target.type === "shopPolicy") {
        const node = data?.shop?.[target.field];
        if (node?.title || node?.body) {
          title = node.title || "";
          body = node.body || "";
        }
      } else if (target.type === "page") {
        const node = data?.pageByHandle;
        if (node?.title || node?.body) {
          title = node.title || "";
          body = node.body || "";
        }
      }
    } catch (e) {
      // لو حدث خطأ في شوبيفاي سنجرب الفول-باك المحلي
    }
  }

  // فول-باك محلي لو لم نجد محتوى من شوبيفاي
  if (!title && !body) {
    const local = getPolicyByHandle(
      // توحيد أي مفاتيح مكتوبة بشكل "policies/refund-policy"
      (target.handle || params?.policy || "").replace(/^policies\//, "")
    );
    if (local) {
      title = local.title || "";
      body = local.content || "";
    }
  }

  if (!title && !body) {
    notFound();
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", direction: "rtl" }}>
      <div style={{ marginBottom: "1rem" }}>
        <a href="/policies" style={{ textDecoration: "none" }}>← رجوع</a>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{title}</h1>
      <article style={{ lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: body }} />
    </main>
  );
}
