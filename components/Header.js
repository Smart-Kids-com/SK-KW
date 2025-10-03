"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import SideMenuCollections from "./SideMenuCollections";

// أيقونات
function MenuIcon(props) {
  return (
    <svg {...props} width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect y="8" width="32" height="2" rx="1" fill="#2563eb" />
      <rect y="15" width="32" height="2" rx="1" fill="#2563eb" />
      <rect y="22" width="32" height="2" rx="1" fill="#2563eb" />
    </svg>
  );
}
function SearchIcon(props) {
  return (
    <svg
      {...props}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function CartIcon(props) {
  return (
    <svg
      {...props}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6h15l-1.5 9h-13z" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M6 6L5 2H2" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  const openMenu = () => setOpen(true);
  const closeMenu = () => setOpen(false);

  // إغلاق بالـ ESC + منع سكرول عند الفتح
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // إغلاق عند الضغط على أي رابط داخل البانل (تفويض)
  const handlePanelClick = (e) => {
    const a = e.target.closest("a");
    if (a) setOpen(false);
  };

  return (
    <>
      <header style={{ width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* شريط الإعلان (كله رابط) */}
        <Link
          href="/collections/مونتيسوري"
          style={{
            display: "block",
            background: "#3d0856",
            color: "#fff",
            textAlign: "center",
            fontSize: "1.25rem",
            fontWeight: 500,
            padding: "0.9rem 0 0.85rem 0",
            letterSpacing: "0.01em",
            position: "relative",
            direction: "rtl",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 16,
              fontSize: 0,
              top: "50%",
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
            }}
            aria-hidden="true"
          >
            <svg width="22" height="22" viewBox="0 0 30 30" fill="none">
              <path
                d="M13 8l5 7-5 7"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          التوصيل مجاناً للطلبات بقيمة 20 د.ك أو أكثر
        </Link>

        {/* الهيدر الأبيض */}
        <div
          style={{
            background: "#fff",
            padding: "0.9rem 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            position: "relative",
          }}
        >
          {/* زر القائمة - يسار */}
          <button
            aria-label="فتح القائمة"
            aria-expanded={open}
            aria-controls="sk-side-menu"
            onClick={openMenu}
            style={{
              background: "none",
              border: "none",
              marginLeft: 16,
              marginRight: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <MenuIcon />
          </button>

          {/* الشعار - وسط */}
          <Link
            href="/"
            style={{
              flex: 1,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <img
              src="//smart-kids.me/cdn/shop/files/Logo_smart_kids-of-header-tag.png?v=1756574543&width=1340"
              alt="شعار SK Smart Kids"
              style={{
                height: 84,
                width: "auto",
                maxWidth: 320,
                objectFit: "contain",
                imageRendering: "auto",
              }}
            />
          </Link>

          {/* أيقونات - يمين */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginRight: 16,
            }}
          >
            <Link href="/search" aria-label="بحث">
              <SearchIcon />
            </Link>
            <Link href="/cart" aria-label="عربة التسوق">
              <CartIcon />
            </Link>
          </div>
        </div>
      </header>

      {/* ===== القائمة الجانبية ===== */}
      {/* Overlay */}
      <div
        onClick={closeMenu}
        aria-hidden={!open}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: open ? "block" : "none",
          zIndex: 1000,
        }}
      />

      {/* Panel */}
      <aside
        id="sk-side-menu"
        role="dialog"
        aria-modal="true"
        dir="rtl"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "320px",
          maxWidth: "85vw",
          background: "#370e3e",
          color: "#fff",
          boxShadow: "-2px 0 16px rgba(0,0,0,.25)",
          transform: open ? "translateX(0)" : "translateX(110%)",
          transition: "transform .25s ease",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={handlePanelClick}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeMenu();
        }}
      >
        {/* رأس البانل */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,.12)",
          }}
        >
          <strong style={{ fontSize: "1.05rem" }}>القائمة</strong>
          <button
            onClick={closeMenu}
            aria-label="إغلاق القائمة"
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.35)",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            إغلاق
          </button>
        </div>

        {/* عناصر القائمة */}
        <div style={{ overflowY: "auto", padding: "10px 12px" }}>
          <SideMenuCollections />
        </div>
      </aside>
    </>
  );
}
