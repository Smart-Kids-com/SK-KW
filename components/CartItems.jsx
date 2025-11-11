"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "@/styles/cart.module.css";
import CartItemRow from "@/components/CartItemRow";
import CartNote from "@/components/CartNote";
import CartSummary from "@/components/CartSummary";

/**
 * CartItems
 * - يجلب السلة من /api/cart/get
 * - يعرِض العناصر + الملاحظة + الإجمالي
 * - يوفّر دوال تغيير الكمية/الحذف/التفريغ/الدفع
 */
export default function CartItems({ initialCart = null, className = "" }) {
  const [cart, setCart] = useState(initialCart);
  const [loading, setLoading] = useState(!initialCart);
  const [error, setError] = useState(null);

  const lines = useMemo(() => {
    if (!cart) return [];
    if (Array.isArray(cart.lines?.edges)) {
      return cart.lines.edges.map(e => e.node);
    }
    if (Array.isArray(cart.items)) return cart.items;
    return [];
  }, [cart]);

  const currency = cart?.cost?.totalAmount?.currencyCode || cart?.total_price?.currency || "KWD";
  const totalAmount =
    cart?.cost?.totalAmount?.amount ||
    cart?.total_price?.amount ||
    cart?.total ||
    0;

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cart/get", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      setCart(data.cart || data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("تعذّر تحميل السلة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCart) fetchCart();
  }, [initialCart, fetchCart]);

  const changeQty = async (lineId, quantity) => {
    try {
      const res = await fetch("/api/cart/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, quantity }),
      });
      if (!res.ok) throw new Error("change qty failed");
      const data = await res.json();
      setCart(data.cart || data);
    } catch (e) {
      console.error(e);
    }
  };

  const removeLine = async (lineId) => changeQty(lineId, 0);

  const clearCart = async () => {
    try {
      const res = await fetch("/api/cart/clear", { method: "POST" });
      if (!res.ok) throw new Error("clear failed");
      const data = await res.json().catch(() => ({}));
      setCart(data.cart || { lines: { edges: [] }, items: [] });
    } catch (e) {
      console.error(e);
      setCart({ lines: { edges: [] }, items: [] });
    }
  };

  const setNote = async (note) => {
    try {
      const res = await fetch("/api/cart/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("note failed");
      const data = await res.json();
      setCart(data.cart || data);
    } catch (e) {
      console.error(e);
    }
  };

  const goCheckout = async () => {
    const url =
      cart?.checkoutUrl ||
      cart?.webUrl ||
      cart?.checkout_url ||
      null;
    if (url) {
      window.location.href = url;
      return;
    }
    try {
      const res = await fetch("/api/cart/get", { cache: "no-store" });
      const data = await res.json();
      const u = data?.cart?.checkoutUrl || data?.checkoutUrl || data?.webUrl;
      if (u) window.location.href = u;
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.card} ${className}`}>
        <div className={styles.loading}>جارِ تحميل السلة…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${styles.card} ${className}`}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <section className={`${styles.cartWrap} ${className}`} dir="rtl">
      {lines.length === 0 ? (
        <div className={styles.empty}>سلتك فارغة حالياً.</div>
      ) : (
        <div className={styles.list}>
          {lines.map((line) => (
            <CartItemRow
              key={line.id || line.merchandiseId || line.variantId}
              line={line}
              onChangeQty={changeQty}
              onRemove={removeLine}
            />
          ))}
        </div>
      )}

      <CartNote
        className={styles.note}
        defaultValue={cart?.note || ""}
        onSave={setNote}
      />

      <CartSummary
        currency={currency}
        total={totalAmount}
        onCheckout={goCheckout}
        onClear={clearCart}
      />
    </section>
  );
}
