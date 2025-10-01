"use client";
import { useCartDrawer } from "../lib/CartDrawerContext";

export default function CartDrawer() {
  const { open, lastAddedProduct, closeDrawer } = useCartDrawer();

  if (!open || !lastAddedProduct) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(41, 8, 87, 0.20)",
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={closeDrawer}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          height: "100%",
          background: "#fff",
          boxShadow: "-2px 0 20px #2e093d22",
          padding: "34px 20px 24px 20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          animation: "slideInCartDrawer .28s"
        }}
      >
        {/* زر الإغلاق */}
        <button
          onClick={closeDrawer}
          aria-label="إغلاق"
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            background: "none",
            border: "none",
            fontSize: 30,
            color: "#3d0856",
            cursor: "pointer",
            lineHeight: 1,
            padding: 0,
            zIndex: 2
          }}
        >
          ×
        </button>

        {/* رسالة النجاح */}
        <div style={{
          color: "#1b43c6",
          fontWeight: 600,
          fontSize: "1.22rem",
          textAlign: "center",
          margin: "0 0 18px 0",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <span style={{ fontSize: 24, color: "#2ee86c" }}>✔</span>
          تم إضافة المنتج إلى عربة التسوق بنجاح
        </div>

        {/* المنتج المضاف */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 30,
          width: "100%"
        }}>
          <img
            src={lastAddedProduct.image}
            alt={lastAddedProduct.title}
            style={{
              width: 96,
              height: 96,
              borderRadius: 12,
              objectFit: "cover",
              background: "#f5f5f5",
              border: "1.5px solid #e4e4e4"
            }}
          />
          <div style={{
            color: "#1b43c6",
            fontSize: "1.11rem",
            fontWeight: 500,
            textAlign: "right"
          }}>
            {lastAddedProduct.title}
          </div>
        </div>

        {/* الأزرار */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 17 }}>
          <a
            href="/cart"
            style={{
              display: "block",
              padding: "18px 0",
              background: "#fff",
              color: "#6b2da7",
              border: "3px solid #6b2da7",
              borderRadius: 16,
              fontWeight: 700,
              fontSize: "1.22rem",
              marginBottom: 2,
              textAlign: "center",
              boxShadow: "0 4px 16px #8b5d9e1a",
              transition: "background .18s,color .18s",
              textDecoration: "none"
            }}
          >
            عرض عربة التسوق
          </a>
          <a
            href="/checkout"
            style={{
              display: "block",
              padding: "18px 0",
              background: "#3d0856",
              color: "#fff",
              border: "none",
              borderRadius: 16,
              fontWeight: 700,
              fontSize: "1.19rem",
              marginBottom: 2,
              textAlign: "center",
              boxShadow: "0 4px 18px #6b2da755",
              textDecoration: "none"
            }}
          >
            الذهاب للدفع
          </a>
          <a
            href="/collections"
            style={{
              display: "block",
              padding: "10px 0 0 0",
              background: "none",
              color: "#6b2da7",
              border: "none",
              borderRadius: 0,
              fontWeight: 500,
              fontSize: "1.07rem",
              textAlign: "center",
              textDecoration: "underline",
              marginTop: 6
            }}
          >
            متابعة الشراء
          </a>
        </div>
      </aside>
      <style>{`
        @keyframes slideInCartDrawer {
          from { transform: translateX(100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}