// app/ar/policies/[policy]/page.js
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getPolicyByHandleLang, getPolicyByHandleShopify } from "@/lib/policyByHandle";

function normalizePolicy(param = "") {
  const h = decodeURIComponent(param).toLowerCase().replace(/^policies\//, "");
  switch (h) {
    case "privacy-policy":
    case "refund-policy":
    case "terms-of-service":
    case "shipping-policy":
    case "contact-information":
      return h;
    default:
      return h; // unknown → سيُعالج بالفول-باك
  }
}

export default async function ARPolicyPage({ params }) {
  const handle = normalizePolicy(params?.policy);
  const LOCALE = "AR"; // هذا المسار عربي
  const USE_SHOPIFY = process.env.USE_SHOPIFY_POLICIES !== "0";

  let node = null;

  if (USE_SHOPIFY) {
    try {
      node = await getPolicyByHandleShopify(handle, LOCALE);
    } catch {
      // نتجاهل ونكمل بالفول-باك
    }
  }

  if (!node) {
    node = getPolicyByHandleLang(handle, LOCALE);
  }

  if (!node?.title && !node?.content) {
    notFound();
  }

  const { title = "", content = "" } = node;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", direction: "rtl" }}>
      <div style={{ marginBottom: "1rem" }}>
        <a href="/policies" style={{ textDecoration: "none" }}>← رجوع</a>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{title}</h1>
      <article style={{ lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: content }} />
    </main>
  );
}
