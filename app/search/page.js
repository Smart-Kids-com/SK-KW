"use client";
import { useState } from "react";
import { t } from "../../lib/i18n";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const locale = "ar";

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearched(true);
    // TODO: Connect to Shopify Storefront API for search
    setResults([]); // Placeholder: update with real results!
  };

  return (
    <section style={{ maxWidth: 900, margin: "3rem auto" }}>
      <h1 style={{ color: "var(--color-primary)" }}>{t("search.title", locale) || "بحث المنتجات"}</h1>
      <form
        onSubmit={handleSearch}
        style={{
          margin: "2rem 0",
          display: "flex",
          gap: 12,
          justifyContent: "center"
        }}
      >
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("search.placeholder", locale) || "ابحث عن منتج..."}
          style={{
            fontSize: "1.1rem",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #bbb",
            width: 300
          }}
        />
        <button
          type="submit"
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            padding: "9px 32px",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "1.05rem"
          }}
        >
          {t("search.button", locale) || "بحث"}
        </button>
      </form>
      <div style={{ marginTop: 30 }}>
        {searched && results.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", marginTop: 30 }}>
            {t("search.no_results", locale) || "لم يتم العثور على نتائج."}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
          {/* TODO: Render search result cards */}
        </div>
      </div>
    </section>
  );
}