"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sideMenu } from "@/lib/menuData";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Side menu listing main collections/pages.
 * Expects sideMenu = [{ title, href }], with href starting with "/".
 */
export default function SideMenuCollections({ onSelect }) {
  const pathname = usePathname() || "/";
  const normalize = (p) => p.replace(/\/+$/, ""); // trim trailing slash

  return (
    <nav className="sk-side-menu" dir="rtl">
      <ul className="sk-list">
        {sideMenu.map((item, i) => {
          const href = item.href || "/";
          const isActive =
            normalize(pathname) === normalize(href) ||
            normalize(pathname).startsWith(normalize(href) + "/");

          return (
            <li key={`menu-${i}-${item.title}`} className="sk-item">
              <Link
                href={href}
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

      {/* Language switcher section */}
      <div className="sk-lang">
        <span className="sk-lang-label">اللغة</span>
        {/* زر بسيط يبدّل بين /ar و / (يحافظ على نفس الصفحة) */}
        <LanguageSwitcher />
      </div>

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

        /* Language switcher style */
        .sk-lang {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.12);
          display: grid;
          gap: 8px;
        }
        .sk-lang-label {
          font-size: .95rem;
          opacity: .9;
          font-weight: 700;
        }
        :global(button[aria-label^="Switch to"]) {
          justify-self: start;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 12px;
          padding: 8px 12px;
          color: #fff;
          background: transparent;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </nav>
  );
}
