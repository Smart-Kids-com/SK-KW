"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CartDrawerCtx = createContext(null);

export function CartDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState(null);
  const [lastAdded, setLastAdded] = useState(null); // {title,image,quantity}

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addToCart = useCallback(async ({ variantId, quantity = 1, openDrawer = true }) => {
    const res = await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "add",
        lines: [{ merchandiseId: variantId, quantity: Number(quantity) }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to add to cart");

    setCart(data.cart || null);

    // استخرج آخر سطر (إن توفّر)
    const edges = data?.cart?.lines?.edges || [];
    const last = edges[edges.length - 1]?.node;
    setLastAdded({
      title: last?.merchandise?.product?.title || last?.merchandise?.title || "تمت الإضافة",
      image: last?.merchandise?.image?.url || last?.merchandise?.product?.featuredImage?.url || null,
      quantity: last?.quantity || Number(quantity),
    });

    if (openDrawer) open();
    return data.cart;
  }, [open]);

  const value = useMemo(() => ({
    isOpen, open, close, cart, setCart, lastAdded, addToCart,
  }), [isOpen, open, close, cart, lastAdded, addToCart]);

  return <CartDrawerCtx.Provider value={value}>{children}</CartDrawerCtx.Provider>;
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerCtx);
  if (!ctx) throw new Error("useCartDrawer must be used within <CartDrawerProvider>");
  return ctx;
}
