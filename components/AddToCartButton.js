
"use client";
import { useState } from "react";

export default function AddToCartButton({ variantId, quantity = 1, goToCheckout = false, children }) {
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!variantId) return alert("Missing variantId (ProductVariant GID)");
    setLoading(true);

    const cartId = typeof window !== "undefined" ? localStorage.getItem("cartId") || null : null;

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", cartId, variantId, quantity }),
    });

    const data = await res.json();
    setLoading(false);

    if (data?.cart?.id) {
      localStorage.setItem("cartId", data.cart.id);
      if (goToCheckout && data.cart.checkoutUrl) {
        window.location.href = data.cart.checkoutUrl;
      }
    } else {
      console.error(data);
      alert(data?.error || "Failed to add to cart");
    }
  }

  return (
    <button onClick={add} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8 }}>
      {loading ? "Adding..." : (children || "Add to Cart")}
    </button>
  );
}
