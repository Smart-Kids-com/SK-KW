// app/(policies)/contact-information/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicyByHandle } from "../../../lib/policyByHandle";
import { fetchShopifyGraphQL } from "@/lib/shopify";

async function fetchContactInfoFromShopify() {
  const QUERY = /* GraphQL */ `
    query ContactInfoAR($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      pageByHandle: page(handle: $handle) {
        title
        body
      }
    }
  `;
  try {
    const data = await fetchShopifyGraphQL(QUERY, {
      language: "AR",
      handle: "contact-information",
    });
    const node = data?.pageByHandle;
    if (node?.title || node?.body) {
      return { title: node.title || "", content: node.body || "" };
    }
  } catch {
    // نتجاهل الخطأ ونجرّب الفول باك المحلي
  }
  return null;
}

export default async function PolicyPage() {
  // 1) حاول من شوبيفاي
  const remote = await fetchContactInfoFromShopify();

  // 2) فول-باك محلي لو مفيش بيانات من شوبيفاي
  const local = getPolicyByHandle("contact-information");

  const title = remote?.title || local?.title || "";
  const content = remote?.content || local?.content || "";

  if (!title && !content) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", direction: "rtl" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/policies">← رجوع</Link>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{title}</h1>
      <article style={{ lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: content }} />
    </main>
  );
}
