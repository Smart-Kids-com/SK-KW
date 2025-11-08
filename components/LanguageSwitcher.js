"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const qs = useSearchParams()?.toString();
  const isAr = pathname.startsWith("/ar");

  const target = isAr
    ? pathname.replace(/^\/ar(\/|$)/, "/") // إلى English
    : (pathname === "/" ? "/ar" : `/ar${pathname}`); // إلى العربية

  const href = qs ? `${target}?${qs}` : target;
  const label = isAr ? "English" : "العربية";

  return (
    <button
      onClick={() => router.push(href)}
      style={{ border: "none", background: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}
      aria-label={`Switch to ${label}`}
    >
      {label} ▾
    </button>
  );
}
