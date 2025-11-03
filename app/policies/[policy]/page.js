// app/policies/[policy]/page.js
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { fetchShopifyGraphQL } from "@/lib/shopify";
import { getPolicyByHandle } from "@/lib/policyByHandle";

/** نطبّع باراميتر المسار */
function normalizePolicy(param = "") {
  const h = decodeURIComponent(param).toLowerCase().replace(/^policies\//, "");
  switch (h) {
    case "privacy-policy":
      return { type: "shopPolicy", field: "privacyPolicy" };
    case "refund-policy":
      return { type: "shopPolicy", field: "refundPolicy" };
    case "terms-of-service":
      return { type: "shopPolicy", field: "termsOfService" };
    case "shipping-policy":
      return { type: "shopPolicy", field: "shippingPolicy" };
    case "contact-information":
      return { type: "page", handle: "contact-information" };
    default:
      return { type: "unknown", handle: h };
  }
}

/** نسحب كل الPolicies من shop (بدون contactInformation) */
async function fetchShopPoliciesAR() {
  const QUERY = /* GraphQL */ `
    query ShopPolicies($language: LanguageCode!) @inContext(language: $language) {
      shop {
        privacyPolicy   { title body }
        refundPolicy    { title body }
        termsOfService  { title body }
        shippingPolicy  { title body }
      }
    }
  `;
  return await fetchShopifyGraphQL(QUERY, { language: "AR" });
}

/** نسحب Page بالـhandle (لـ contact-information) */
async function fetchPageAR(handle) {
  const QUERY = /* GraphQL */ `
    query PageByHandleAR($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) { title body }
    }
  `;
  return await fetchShopifyGraphQL(QUERY, { language: "AR", handle });
}

export default async function PolicyRoute({ params }) {
  const target = normalizePolicy(params?.policy);

  let title = "";
  let body = "";

  try {
    if (target.type === "shopPolicy") {
      const data = await fetchShopPoliciesAR();
      const node = data?.shop?.[target.field];
      if (node?.title || node?.body) {
        title = node.title || "";
        body = node.body || "";
      }
    } else if (target.type === "page") {
      const data = await fetchPageAR(target.handle);
      const node = data?.page;
      if (node?.title || node?.body) {
        title = node.title || "";
        body = node.body || "";
      }
    }
  } catch (e) {
    // لو فشل الـAPI هنجرّب الفول-باك المحلي تحت
  }

  // فول-باك محلي
  if (!title && !body) {
    const local = getPolicyByHandle(target.handle || params?.policy || "");
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
