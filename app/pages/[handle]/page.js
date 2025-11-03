// app/pages/[handle]/page.js
import { notFound } from "next/navigation";
import { fetchShopifyGraphQL } from "@/lib/shopify";

// نخليها دايمًا تجيب أحدث نسخة من شوبيفاي
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StaticPage({ params }) {
  // لو محتاجين نطبع الهاندل للتأكد:
  // console.log("Page handle:", params?.handle);

  const QUERY = /* GraphQL */ `
    query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) { id title body }
    }
  `;

  // نستخدم العربية لأن محتوى صفحاتك HTML عربي
  const data = await fetchShopifyGraphQL(QUERY, {
    language: "AR",
    handle: params?.handle,
  });

  const page = data?.page;
  if (!page) notFound();

  return (
    <main
      dir="rtl"
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
        lineHeight: 1.9,
      }}
    >
      <h1 style={{ fontSize: "1.8rem", margin: "0 0 12px", fontWeight: 800 }}>
        {page.title}
      </h1>

      {/* نعرض HTML القادم من شوبيفاي كما هو */}
      <article dangerouslySetInnerHTML={{ __html: page.body }} />
    </main>
  );
}
