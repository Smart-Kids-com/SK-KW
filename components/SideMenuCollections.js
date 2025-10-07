"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sideMenu } from "../lib/menuData";

function encodePath(p = "") {
  return p
    .replace(/^\/+/, "") // شيل أي سلاشات في البداية
    .split("/")
    .map(seg => encodeURIComponent(seg))
    .join("/");
}

function buildHref(item) {
  // لو فيه href في البيانات، استخدمه كما هو (مع تنظيف وترميز)
  if (item.href !== undefined) return encodePath(item.href);

  const h = (item.handle || "").trim();
  if (!h) return ""; // الهوم
  // لو الـ handle أصلاً فيه prefix معروف سيبه
  if (h.startsWith("collections/") || h.startsWith("pages/") || h.startsWith("blogs/")) {
    return encodePath(h);
  }
  // اعتبره handle لمجموعة
  return encodePath(`collections/${h}`);
}

export default function SideMenuCollections({ onSelect }) {
  const pathname = usePathname(); // بيرجع بشكل يبدأ بـ "/"
  const current = pathname.replace(/^\/+/, ""); // خلّيه بدون "/"

  return (
    <nav className="sk-side-menu" dir="rtl">
      <ul className="sk-list">
        {sideMenu.map((item, i) => {
          const href = buildHref(item); // لا تبدأ بـ "/"
          const isActive =
            href === "" ? current === "" : current === href || current.startsWith(`${href}/`);

          return (
            <li key={`menu-${i}-${item.title}`} className="sk-item">
              <Link
                href={href}                // مفيش "/" في البداية
                prefetch={false}
                onClick={onSelect}
                className={`sk-link${isActive ? " is-active" : ""}`}
                aria-label={item.title}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>

      <style jsx>{`
        .sk-side-menu {
          padding: 12px 16px;
          background: var(--sk-menu-bg, #370e3e);
          color: #fff;
          min-height: 100%;
        }
        .sk-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .sk-item { margin: 0; }
        .sk-link {
          display: block;
          text-decoration: none;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 10px 12px;
          border-radius: 10px;
          transition: background .2s ease, transform .1s ease;
        }
        .sk-link:hover, .sk-link:focus-visible { background: rgba(255,255,255,.08); }
        .sk-link:active { transform: translateY(1px); }
        .sk-link.is-active { background: rgba(255,255,255,.14); }
      `}</style>
    </nav>
  );
}
