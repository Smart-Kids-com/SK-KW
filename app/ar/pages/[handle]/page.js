// app/ar/pages/[handle]/page.js
import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function StaticPageAR({ params }) {
  const QUERY = /* GraphQL */ `
    query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) { id title body }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR", handle: params.handle });
  const page = data?.page;
  const isContact = params.handle === "contact-us"; // نفس الـhandle في المتجر

  if (!page) {
    return <main style={{ padding: 24, direction: "rtl" }}>غير موجود.</main>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", direction: "rtl" }}>
      <h1>{page.title}</h1>
      {/* محتوى Shopify كما هو */}
      <article dangerouslySetInnerHTML={{ __html: page.body }} />

      {/* نموذج Shopify الأصلي (يرسل إلى المتجر مباشرة) */}
      {isContact && (
        <form
          method="post"
          action="/contact"
          style={{ marginTop: 24, display: "grid", gap: 12, maxWidth: 700 }}
        >
          <input type="hidden" name="form_type" value="contact" />
          <input type="hidden" name="utf8" value="✓" />

          <input
            required
            name="contact[name]"
            placeholder="الاسم"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            required
            type="email"
            name="contact[email]"
            placeholder="البريد الإلكتروني"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            name="contact[subject]"
            placeholder="الموضوع (اختياري)"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <textarea
            required
            name="contact[body]"
            placeholder="رسالتك"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", minHeight: 140 }}
          />

          <button
            type="submit"
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: "#3d0856",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إرسال
          </button>
        </form>
      )}
    </main>
  );
}
