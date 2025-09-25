"use client";
import { useState } from "react";

export default function QuantityInput({ value = 1, min = 1, max = 99, onChange }) {
  const [qty, setQty] = useState(value);

  const inc = () => {
    if (qty < max) {
      setQty(qty + 1);
      onChange && onChange(qty + 1);
    }
  };
  const dec = () => {
    if (qty > min) {
      setQty(qty - 1);
      onChange && onChange(qty - 1);
    }
  };
  const handleInput = e => {
    let val = parseInt(e.target.value, 10) || min;
    if (val < min) val = min;
    if (val > max) val = max;
    setQty(val);
    onChange && onChange(val);
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "1rem 0" }}>
      <button type="button" onClick={dec} style={{
        background: "#eee", border: "none", borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: "1.2rem", cursor: "pointer"
      }}>-</button>
      <input
        type="number"
        value={qty}
        min={min}
        max={max}
        onChange={handleInput}
        style={{
          width: 48, textAlign: "center", fontSize: "1.1rem", borderRadius: 6, border: "1px solid #ddd"
        }}
      />
      <button type="button" onClick={inc} style={{
        background: "#eee", border: "none", borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: "1.2rem", cursor: "pointer"
      }}>+</button>
    </div>
  );
}