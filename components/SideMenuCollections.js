"use client";

import Link from "next/link";
import { sideMenu } from "../lib/menuData";

export default function SideMenuCollections({ onSelect }) {
  return (
    <nav className="sk-side-menu" dir="rtl">
      <ul className="sk-list">
        {sideMenu.map((item, i) => {
          const href =
            item.href ||
            (item.handle ? `/collections/${encodeURIComponent(item.handle)}` : "#");
          return (
            <li key={`menu-${i}-${item.title}`} className="sk-item">
              <Link
                href={href}
                onClick={onSelect}
                className="sk-link"
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
        .sk-item {
          margin: 0;
        }
        .sk-link {
          display: block;
          width: 100%;
          text-decoration: none;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 10px 12px;
          border-radius: 10px;
          transition: background 0.2s ease, transform 0.1s ease;
        }
        .sk-link:hover,
        .sk-link:focus-visible {
          background: rgba(255, 255, 255, 0.08);
        }
        .sk-link:active {
          transform: translateY(1px);
        }
      `}</style>
    </nav>
  );
}
