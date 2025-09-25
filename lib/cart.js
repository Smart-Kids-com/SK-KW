"use client";
import { useState, useEffect } from "react";

// Local cart state for demo – replace with Shopify AJAX API for a real store.
export function useCart() {
  const [cart, setCart] = useState({ items: [], subtotal: 0, currency: "KWD" });

  useEffect(() => {
    const stored = typeof window !== "undefined" && window.localStorage.getItem("cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  function addItem(product, variantId, quantity = 1) {
    setCart(prev => {
      let found = false;
      const items = prev.items.map(item => {
        if (item.variantId === variantId) {
          found = true;
          return { ...item, quantity: item.quantity + quantity };
        }
        return item;
      });
      if (!found) {
        items.push({
          id: product.id,
          title: product.title,
          image: product.featuredImage?.src || "",
          price: product.price,
          currency: product.currency,
          variantId,
          quantity
        });
      }
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { ...prev, items, subtotal };
    });
  }

  function removeItem(variantId) {
    setCart(prev => {
      const items = prev.items.filter(item => item.variantId !== variantId);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { ...prev, items, subtotal };
    });
  }

  function updateQuantity(variantId, quantity) {
    setCart(prev => {
      const items = prev.items.map(item =>
        item.variantId === variantId ? { ...item, quantity } : item
      );
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { ...prev, items, subtotal };
    });
  }

  function clearCart() {
    setCart({ items: [], subtotal: 0, currency: "KWD" });
  }

  return { cart, addItem, removeItem, updateQuantity, clearCart };
}