"use client";
import { createContext, useContext, useState } from "react";

// إنشاء الكونتكست الرئيسي
export const CartDrawerContext = createContext();

// هوك للاستخدام السهل داخل أي مكون
export function useCartDrawer() {
  return useContext(CartDrawerContext);
}

// المزود الأساسي الذي يلتف حول الموقع كله
export function CartDrawerProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState(null);

  // فتح المنزلقة مع تمرير بيانات المنتج المضاف
  function openDrawer(product) {
    setLastAddedProduct(product);
    setOpen(true);
  }

  // إغلاق المنزلقة
  function closeDrawer() {
    setOpen(false);
    setLastAddedProduct(null);
  }

  return (
    <CartDrawerContext.Provider
      value={{
        open,
        lastAddedProduct,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}