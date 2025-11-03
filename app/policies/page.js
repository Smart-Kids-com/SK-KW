// app/policies/page.js
import Link from "next/link";
import { getAllPolicies } from "@/lib/policyByHandle";

export const dynamic = "force-dynamic";

// عند الاعتماد على شوبيفاي فقط نعرض الروابط المعروفة يدوياً
const SHOPIFY_HANDLES = [
  "privacy-policy",
  "terms-of-service",
  "shipping-policy",
  "refund-policy",
  "contact-information",
];

const TITLES = {
  "privacy-policy": "سياسة الخصوصية",
  "terms-of-service": "شروط الخدمة",
  "shipping-policy": "سياسة الشحن",
  "refund-policy": "سياسة الاسترجاع والاستبدال",
  "contact-information": "معلومات التواصل",
};

export default function PoliciesIndex() {
  const useShopify = process.env.USE_SHOPIFY_POLICIES === "1";

  // إن كان الاعتماد على شوبيفاي: قائمة ثابتة بمسارات السياسات المتاحة
  // إن كان محلي: نقرأ من lib/policyByHandle.js ونطبع المسارات
  const items = useShopify
    ? SHOPIFY_HANDLES.map((handle) => ({
        handle,
        title: TITLES[handle] || handle,
      }))
    : Object.entries(getAllPolicies()).map(([rawHandle, data]) => {
        // بعض الإدخالات لديك قد تكون مثل "policies/refund-policy"
        const handle = rawHandle.replace(/^policies\//, "");
        return { handle, title: data?.title || handle };
      });

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
            <Link href={`/policies/${handle}`} style={{ textDecoration: "none" }}>
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
