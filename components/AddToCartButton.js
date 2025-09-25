"use client";
import { useCart } from "../lib/cart";
import { useState } from "react";

export default function AddToCartButton({ product, variantId, quantity = 1 }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem(product, variantId, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      style={{
        background: "var(--color-primary)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "12px 28px",
        fontSize: "1.1rem",
        cursor: "pointer",
        marginBottom: 18,
        marginTop: 12
      }}
    >
      {added ? "تمت الإضافة!" : "أضف إلى عربة التسوق"}
    </button>
  );
}