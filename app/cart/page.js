"use client";
import { useCart } from "../../lib/cart";
import { t } from "../../lib/i18n";

export default function CartPage() {
  const { cart, removeItem, updateQuantity, clearCart } = useCart();
  const locale = "ar";

  if (!cart.items.length) {
    return (
      <section style={{ maxWidth: 700, margin: "3rem auto", textAlign: "center" }}>
        <h1 style={{ color: "var(--color-primary)" }}>{t("cart.title", locale) || "عربة التسوق"}</h1>
        <div style={{ color: "#888", fontSize: "1.15rem", margin: "2rem 0" }}>
          {t("cart.empty", locale) || "عربة التسوق فارغة حالياً."}
        </div>
        <a
          href="/collections"
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "1.1rem"
          }}
        >
          {t("cart.continue_shopping", locale) || "تصفّح المنتجات"}
        </a>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 900, margin: "3rem auto" }}>
      <h1 style={{ color: "var(--color-primary)", marginBottom: 24 }}>{t("cart.title", locale) || "عربة التسوق"}</h1>
      <table style={{ width: "100%", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px #0001" }}>
        <thead>
          <tr style={{ background: "var(--color-light)", fontWeight: 700 }}>
            <th>{t("cart.product", locale) || "المنتج"}</th>
            <th>{t("cart.price", locale) || "السعر"}</th>
            <th>{t("cart.quantity", locale) || "العدد"}</th>
            <th>{t("cart.total", locale) || "الإجمالي"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map(item => (
            <tr key={item.variantId}>
              <td>
                <img src={item.image} alt={item.title} style={{ width: 70, borderRadius: 8, marginInlineEnd: 8 }} />
                {item.title}
              </td>
              <td>
                {Number(item.price).toLocaleString("ar-KW", {
                  style: "currency",
                  currency: item.currency
                })}
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={e => updateQuantity(item.variantId, Number(e.target.value))}
                  style={{ width: 48, textAlign: "center", borderRadius: 6, border: "1px solid #ddd" }}
                />
              </td>
              <td>
                {Number(item.price * item.quantity).toLocaleString("ar-KW", {
                  style: "currency",
                  currency: item.currency
                })}
              </td>
              <td>
                <button
                  style={{
                    background: "var(--color-error)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    cursor: "pointer"
                  }}
                  onClick={() => removeItem(item.variantId)}
                >
                  {t("cart.remove", locale) || "إزالة"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: "end", marginTop: 24, fontWeight: 700, fontSize: "1.2rem" }}>
        {t("cart.total", locale) || "الإجمالي"}:&nbsp;
        {Number(cart.subtotal).toLocaleString("ar-KW", {
          style: "currency",
          currency: cart.currency
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "end", gap: 12, marginTop: 18 }}>
        <a
          href="/checkout"
          style={{
            background: "var(--color-accent)",
            color: "#111",
            padding: "12px 36px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "1.1rem",
            textDecoration: "none"
          }}
        >
          {t("cart.checkout", locale) || "إكمال الطلب"}
        </a>
        <button
          onClick={clearCart}
          style={{
            background: "#eee",
            color: "#d11",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer"
          }}
        >
          {t("cart.clear", locale) || "إفراغ السلة"}
        </button>
      </div>
    </section>
  );
}