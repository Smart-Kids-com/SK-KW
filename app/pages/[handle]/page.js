// app/pages/[handle]/page.js
import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function StaticPage({ params }) {
  const QUERY = /* GraphQL */ `
    query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) { id title body }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "EN", handle: params.handle });
  const page = data?.page;
  const isContact = params.handle === "contact-us"; // change if your handle differs

  if (!page) {
    return <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>Not found.</main>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>{page.title}</h1>
      {/* Render Shopify content exactly */}
      <article dangerouslySetInnerHTML={{ __html: page.body }} />

      {/* Native Shopify contact form (posts to your store) */}
      {isContact && (
        <form
          method="post"
          action="https://smart-kids.me/contact#contact_form"
          style={{ marginTop: 24, display: "grid", gap: 12, maxWidth: 700 }}
        >
          <input type="hidden" name="form_type" value="contact" />
          <input type="hidden" name="utf8" value="✓" />

          <input
            required
            name="contact[name]"
            placeholder="Name"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            required
            type="email"
            name="contact[email]"
            placeholder="Email"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            name="contact[subject]"
            placeholder="Subject (optional)"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <textarea
            required
            name="contact[body]"
            placeholder="Your message"
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
            Send
          </button>
        </form>
      )}
    </main>
  );
}
