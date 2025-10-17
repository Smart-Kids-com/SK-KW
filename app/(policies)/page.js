// app/(policies)/page.js
import Link from "next/link";
// لأن الملف داخل app/(policies) ونريد الوصول إلى lib في الجذر:
import { getAllPolicies } from "../../lib/policyByHandle";

export const dynamic = "force-dynamic";

export default function PoliciesIndex() {
  const entries = Object.entries(getAllPolicies()); // [[handle, {title, content}], ...]
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", direction: "rtl" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>سياسات الموقع</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {entries.map(([handle, data]) => (
          <li key={handle} style={{ border: "1px solid #eee", borderRadius: 12, padding: "0.9rem 1rem" }}>
            <Link href={`/policies/${handle}`} style={{ textDecoration: "none" }}>
              {data.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
