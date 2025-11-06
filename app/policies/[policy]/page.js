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
      return h;
  }
}

export default async function PolicyRoute({ params }) {
  const handle = normalizePolicy(params?.policy);
  const LOCALE = "EN";
  const USE_SHOPIFY = process.env.USE_SHOPIFY_POLICIES !== "0";

  let node = null;

  if (USE_SHOPIFY) {
    try {
      node = await getPolicyByHandleShopify(handle, LOCALE);
    } catch {}
  }

  if (!node) {
    node = getPolicyByHandleLang(handle, LOCALE);
  }

  if (!node?.title && !node?.content) {
    notFound();
  }

  const { title = "", content = "" } = node;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <a href="/policies" style={{ textDecoration: "none" }}>← Back</a>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{title}</h1>
      <article style={{ lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: content }} />
    </main>
  );
}
