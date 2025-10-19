// app/policies/page.js
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PoliciesIndex() {
  // Minimal test: link a single handle exactly as you want it live
  const items = [
    { handler: "refund-policy", label: "سياسة الاسترجاع والاستبدال" }, // ← test this one first
  ];

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", direction: "rtl" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>سياسات الموقع</h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {items.map((it) => (
          <li key={it.href} style={{ border: "1px solid #eee", borderRadius: 12, padding: "0.9rem 1rem" }}>
            <Link href={it.href} style={{ textDecoration: "none" }}>{it.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
