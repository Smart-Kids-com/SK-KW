"use client";
import { useCart } from "../lib/cart";
import { useCartDrawer } from "../lib/CartDrawerContext";

export default function AddToCartButton({ product, variantId, quantity = 1 }) {
  const { addItem } = useCart();
  const { openDrawer } = useCartDrawer();

  function handleAdd() {
    addItem(product, variantId, quantity);
    openDrawer(product); // يفتح المنزلقة مع بيانات المنتج المضاف
  }

  return (
    <button
      onClick={handleAdd}
      style={{
        background: "#ffd94d",
        color: "#3d0856",
        border: "none",
        borderRadius: "10px",
        padding: "12px 30px",
        fontWeight: 700,
        fontSize: "1.1rem",
        cursor: "pointer",
        boxShadow: "0 2px 12px #ffd94d44",
        transition: "all .18s"
      }}
    >
      أضف إلى عربة التسوق
    </button>
  );
}