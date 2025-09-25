"use client";
import { useState } from "react";

export default function ProductVariantSelector({ variants = [], onChange }) {
  const [selected, setSelected] = useState(variants[0]?.id || null);

  function handleChange(e) {
    setSelected(e.target.value);
    if (onChange) onChange(e.target.value);
  }

  if (!variants.length) return null;
  if (variants.length === 1)
    return (
      <div style={{ margin: "1rem 0" }}>
        <span style={{ fontWeight: 600 }}>النوع:</span> {variants[0].title}
      </div>
    );

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <label style={{ fontWeight: 600, marginInlineEnd: 12 }}>اختر النوع:</label>
      <select value={selected} onChange={handleChange} style={{
        fontSize: "1.1rem",
        padding: "5px 18px",
        borderRadius: 8,
        border: "1px solid #bbb"
      }}>
        {variants.map(v => (
          <option key={v.id} value={v.id} disabled={!v.availableForSale}>
            {v.title} {v.availableForSale ? "" : " (غير متوفر)"}
          </option>
        ))}
      </select>
    </div>
  );
}