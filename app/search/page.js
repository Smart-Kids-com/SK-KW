"use client";

import { useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setSearched(true);
    // TODO: اربط بـ Shopify لاحقًا
    setResults([]); // Placeholder
  }

  return (
    <section style={{ maxWidth: 900, margin: "3rem auto" }}>
      <h1 style={{ color: "var(--color-primary)" }}>بحث المنتجات</h1>

      <form onSubmit={handleSearch} style={{ margin: "2rem 0", display: "flex", gap: 12, justifyContent: "center" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج..."
          style={{ fontSize: "1.1rem", padding: "8px 16px", borderRadius: 8, border: "1px solid #bbb", width: 300 }}
        />
        <button type="submit" style={{
          background: "var(--color-primary)", color: "#fff", padding: "9px 32px",
          border: "none", borderRadius: 8, fontWeight: 600, fontSize: "1.05rem"
        }}>
          بحث
        </button>
      </form>

      <div style={{ marginTop: 30 }}>
        {searched && results.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", marginTop: 30 }}>
            لم يتم العثور على نتائج.
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
          {/* TODO: كروت النتائج لاحقًا */}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/" style={{ color: "#4f46e5", fontWeight: 700 }}>العودة للصفحة الرئيسية</Link>
      </div>
    </section>
  );
}
