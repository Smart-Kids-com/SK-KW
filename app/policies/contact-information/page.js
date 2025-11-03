// app/(policies)/contact-information/page.js
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchShopifyGraphQL } from "@/lib/shopify";
import { getPolicyByHandle } from "@/lib/policyByHandle";

export const dynamic = "force-dynamic";

async function fetchContactInformation() {
  // صفحات Shopify العادية تُجلب عبر page(handle: ...)
  const QUERY = /* GraphQL */ `
    query ContactInformation($lang: LanguageCode!) @inContext(language: $lang) {
      page(handle: "contact-information") {
        title
        body
      }
    }
  `;
  try {
    const data = await fetchShopifyGraphQL(QUERY, { lang: "AR" });
    const page = data?.page;
    if (page?.body) {
      return { title: page.title || "معلومات التواصل", content: page.body };
    }
  } catch (e) {
    // نكمّل للـ fallback تحت
  }
  // Fallback محلي لو Shopify معندوش الصفحة
  const local = getPolicyByHandle("contact-information");
  return local || null;
}

export default async function PolicyPage() {
  const data = await fetchContactInformation();
  if (!data) notFound();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", direction: "rtl" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/policies">← رجوع</Link>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{data.title}</h1>
      <article style={{ lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: data.content }} />
    </main>
  );
}
