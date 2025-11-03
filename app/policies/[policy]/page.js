// app/policies/[policy]/page.js
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchShopifyGraphQL } from "@/lib/shopify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHOP_POLICIES_MAP = {
  "privacy-policy": "privacyPolicy",
  "refund-policy": "refundPolicy",
  "terms-of-service": "termsOfService",
  "shipping-policy": "shippingPolicy",
  "contact-information": "contactInformation",
};

const AR_TITLES_FALLBACK = {
  "privacy-policy": "سياسة الخصوصية",
  "refund-policy": "سياسة الاسترجاع والاستبدال",
  "terms-of-service": "شروط الخدمة",
  "shipping-policy": "سياسة الشحن",
  "contact-information": "معلومات التواصل",
};

async function fetchShopPolicy(policyHandle) {
  const field = SHOP_POLICIES_MAP[policyHandle];
  if (!field) return null;

  const QUERY = /* GraphQL */ `
    query ShopPolicies($language: LanguageCode!) @inContext(language: $language) {
      shop {
        privacyPolicy   { title body }
        refundPolicy    { title body }
        termsOfService  { title body }
        shippingPolicy  { title body }
        contactInformation { title body }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR" });
  const policy = data?.shop?.[field] || null;
  if (!policy) return null;

  return {
    title: policy.title?.trim() || AR_TITLES_FALLBACK[policyHandle],
    body: policy.body || "",
  };
}

async function fetchContactInformationAsPage() {
  const QUERY = /* GraphQL */ `
    query PageByHandle($language: LanguageCode!, $handle: String!) @inContext(language: $language) {
      page(handle: $handle) { title body }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR", handle: "contact-information" });
  const page = data?.page || null;
  if (!page) return null;

  return {
    title: page.title?.trim() || AR_TITLES_FALLBACK["contact-information"],
    body: page.body || "",
  };
}

export default async function PolicyRoute({ params }) {
  const handle = params?.policy;

  let result = null;
  if (handle === "contact-information") {
    result = await fetchContactInformationAsPage();
  } else {
    result = await fetchShopPolicy(handle);
  }

  if (!result) notFound();

  return (
    <main dir="rtl" style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", lineHeight: 1.9 }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/policies" style={{ textDecoration: "none" }}>← رجوع</Link>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{result.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: result.body }} />
    </main>
  );
}
