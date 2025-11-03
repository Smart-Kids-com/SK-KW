// app/pages/[handle]/page.js
import { notFound } from "next/navigation";
import { fetchShopifyGraphQL } from "@/lib/shopify";

// نضمن دومًا جلب أحدث نسخة من شوبيفاي
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** تطبيع الهاندل حتى لو جاينا بحروف كبيرة أو URL-encoded */
function normalizeHandle(raw) {
  const h = decodeURIComponent(String(raw || "")).trim();
  // أحيانًا ييجي بصيغ غريبة، نخليه Lowercase وبدون فراغات
  return h.toLowerCase();
}

export default async function StaticPage({ params }) {
  const handle = normalizeHandle(params?.handle);

  // حماية: لو الهاندل فاضي نطلع 404
  if (!handle) notFound();

  const QUERY = /* GraphQL */ `
    query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) {
        id
        title
        body
      }
    }
  `;

  let page = null;
  try {
    const data = await fetchShopifyGraphQL(QUERY, { language: "AR", handle });
    page = data?.page || null;
  } catch {
    // لو حصل خطأ من الشبكة/GraphQL نُظهر 404 بدل كراش
    page = null;
  }

  // لو مش لاقيين صفحة أو جسمها فاضي → 404
  if (!page || !(page.body && page.body.trim())) {
    notFound();
  }

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
      {page.title && (
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 12px", fontWeight: 800 }}>
          {page.title}
        </h1>
      )}

      {/* نعرض HTML القادم من شوبيفاي كما هو */}
      <article dangerouslySetInnerHTML={{ __html: page.body }} />
    </main>
  );
}
