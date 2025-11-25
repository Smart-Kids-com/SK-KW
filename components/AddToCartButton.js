"use client";
import { useState } from "react";
import { useCartDrawer } from "@/lib/CartDrawerContext";

export default function AddToCartButton({
  variantId,
  quantity = 1,
  goToCheckout = false,
  children,
  style,
  className,
  onAdded,
}) {
  const [loading, setLoading] = useState(false);

  // هنحاول نستخدم الكونتكست؛ لو الزر خارج الـProvider هنقع للفول باك
  let ctx = null;
  try { ctx = useCartDrawer(); } catch {}

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

  async function onClick(e) {
    e?.preventDefault?.();

    if (!variantId) {
      console.error("Missing variantId");
      alert("Missing variantId (ProductVariant GID)");
      return;
    }

    if (loading) return;
    setLoading(true);

    const btnQty = Number(e?.currentTarget?.dataset?.qty || quantity || 1);

    try {
      // داخل الكونتكست → يضيف ويفتح الدروار تلقائيًا (إلا لو goToCheckout)
      const cart = ctx
        ? await ctx.addToCart({ variantId, quantity: btnQty, openDrawer: !goToCheckout })
        : await addDirect(btnQty);

      if (typeof onAdded === "function") onAdded(cart);

      if (goToCheckout && cart?.checkoutUrl) {
        window.location.href = cart.checkoutUrl;
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading ? "true" : "false"}
      className={className}
      style={{ padding: "10px 16px", borderRadius: 12, fontWeight: 700, ...(style || {}) }}
    >
      {loading ? "جارِ الإضافة..." : (children || "أضف إلى السلة")}
    </button>
  );
}
