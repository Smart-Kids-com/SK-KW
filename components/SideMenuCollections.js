"use client";

import Link from "next/link";
import { sideMenu } from "../lib/menuData";

export default function SideMenuCollections({ onSelect }) {
  return (
    <nav dir="rtl" style={{ padding: "12px 16px" }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "14px" }}>
        {sideMenu.map((item, i) => {
          const href = item.href || (item.handle ? `/collections/${encodeURIComponent(item.handle)}` : "#");
          return (
            <li key={`${item.title}-${i}`}>
              <Link
                href={href}
                onClick={onSelect}
                style={{ textDecoration: "none", color: "inherit", fontSize: "1.1rem", fontWeight: 600 }}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
