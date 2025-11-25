// app/cart/page.js
"use client";

import CartItems from "@/components/CartItems";

export default function CartPage() {
  return (
    <main
      dir="rtl"
      style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}
    >
      <h1>سلة التسوق</h1>
      <CartItems />
  </main>
);
}