// app/ar/policies/page.js
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllPoliciesLang } from "@/lib/policyByHandle";

// عناوين عربية جاهزة
const TITLES_AR = {
  "privacy-policy": "سياسة الخصوصية",
  "terms-of-service": "شروط الخدمة",
  "shipping-policy": "سياسة الشحن",
  "refund-policy": "سياسة الاسترجاع والاستبدال",
  "contact-information": "معلومات التواصل",
};

// هندلات معروفة إن لزم
const KNOWN_HANDLES = [
  "privacy-policy",
  "terms-of-service",
  "shipping-policy",
  "refund-policy",
  "contact-information",
];

export default function PoliciesIndexAR() {
  // نقرأ من المصدر المحلي العربي
  const local = getAllPoliciesLang("ar") || {};
  const localItems = Object.entries(local).map(([rawHandle, data]) => {
    const handle = rawHandle.replace(/^policies\//, "");
    return { handle, title: data?.title || TITLES_AR[handle] || handle };
  });

  // لو ما وجدنا شيء لأي سبب، نستخدم القائمة المعروفة
  const items =
    localItems.length > 0
      ? localItems
      : KNOWN_HANDLES.map((handle) => ({
          handle,
          title: TITLES_AR[handle] || handle,
        }));

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "2rem 1rem",
        direction: "rtl",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>سياسات الموقع</h1>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {items.map(({ handle, title }) => (
          <li
            key={handle}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: "0.9rem 1rem",
            }}
          >
            <Link href={`/ar/policies/${handle}`} style={{ textDecoration: "none" }}>
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
