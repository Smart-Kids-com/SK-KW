"use client";
import { useMemo, useState } from "react";

/**
 * props:
 * - variants: Array<{ id, title, availableForSale, price?: { amount, currencyCode }, selectedOptions?: [{name,value}] }>
 * - onChange?: (variantId: string, variantObj: any) => void
 * - label?: string
 * - defaultVariantId?: string
 */
export default function ProductVariantSelector({ variants = [], onChange, label = "اختر النوع:", defaultVariantId }) {
  // اختَر أول متاح، أو المعيّن افتراضيًا، أو أول عنصر لو كله سولد أوت
  const initialId = useMemo(() => {
    if (!Array.isArray(variants) || variants.length === 0) return null;
    if (defaultVariantId) {
      const hit = variants.find(v => v?.id === defaultVariantId);
      if (hit) return hit.id;
    }
    const firstAvailable = variants.find(v => v?.availableForSale);
    return (firstAvailable || variants[0])?.id || null;
  }, [variants, defaultVariantId]);

  const [selected, setSelected] = useState(initialId);

  function handleChange(e) {
    const id = e.target.value;
    setSelected(id);
    if (onChange) {
      const v = variants.find(x => x?.id === id) || null;
      onChange(id, v);
    }
  }

  if (!Array.isArray(variants) || variants.length === 0) return null;

  // حالة Variant واحد: نعرضه كنص فقط
  if (variants.length === 1) {
    const only = variants[0];
    return (
      <div style={{ margin: "1rem 0" }}>
        <span style={{ fontWeight: 600 }}>النوع:</span>{" "}
        {only.title} {only.availableForSale ? "" : " (غير متوفر)"}
      </div>
    );
  }

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <label htmlFor="variant-select" style={{ fontWeight: 600, marginInlineEnd: 12 }}>
        {label}
      </label>
      <select
        id="variant-select"
        value={selected || ""}
        onChange={handleChange}
        dir="rtl"
        style={{
          fontSize: "1.05rem",
          padding: "8px 16px",
          borderRadius: 10,
          border: "1px solid #bbb",
          background: "#fff",
          minWidth: 220,
        }}
      >
        {variants.map((v) => {
          const text = v?.title || "خيار";
          const soldOut = v?.availableForSale === false;
          return (
            <option key={v.id} value={v.id} disabled={soldOut}>
              {text}{soldOut ? " (غير متوفر)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
