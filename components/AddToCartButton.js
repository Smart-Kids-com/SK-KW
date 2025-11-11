"use client";
import { useState } from "react";
import { useCartDrawer } from "@/lib/CartDrawerContext"; // ← موجود عندك حسب القائمة

export default function AddToCartButton({
  variantId,
  quantity = 1,
  goToCheckout = false,
  children,
  style,
  onAdded,
}) {
  const [loading, setLoading] = useState(false);

  // جرّب استخدام الكونتكست إن وُجد
  let ctx = null;
  try { ctx = useCartDrawer(); } catch { /* خارج الـProvider */ }

  async function addDirect(qty) {
    const res = await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "add",
        lines: [{ merchandiseId: variantId, quantity: Number(qty) }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to add to cart");
    return data.cart;
  }

  async function add(e) {
    if (!variantId) return alert("Missing variantId (ProductVariant GID)");
    setLoading(true);

    const btnQty = Number(e?.currentTarget?.dataset?.qty || quantity || 1);

    try {
      const cart = ctx
        ? await ctx.addToCart({ variantId, quantity: btnQty, openDrawer: !goToCheckout })
        : await addDirect(btnQty);

      if (typeof onAdded === "function") onAdded(cart);
      if (goToCheckout && cart?.checkoutUrl) window.location.href = cart.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={add} disabled={loading} style={{ padding: "10px 16px", borderRadius: 12, ...(style || {}) }}>
      {loading ? "Adding..." : (children || "Add to Cart")}
    </button>
  );
}