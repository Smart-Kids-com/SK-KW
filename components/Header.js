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
          href="/collections/%D9%85%D9%88%D9%86%D8%AA%D9%8A%D8%B3%D9%88%D8%B1%D9%8A"
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
            <a 
              href="https://wa.me/96550424642" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="واتساب"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                backgroundColor: "#25D366",
                borderRadius: "50%",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.1)";
                e.target.style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "none";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.106"/>
              </svg>
            </a>
            <Link href="/search" aria-label="بحث">
              <SearchIcon />
            </Link>
            <Link href="/wishlist" aria-label="المفضلة">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </Link>
            <Link href="/account" aria-label="حسابي">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
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
