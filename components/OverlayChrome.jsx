"use client";

import { useEffect, useRef } from "react";

export default function OverlayChrome() {
  const topRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = topRef.current;
    if (!el) return;

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > 4) el.classList.add("scrolled");
      else el.classList.remove("scrolled");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style jsx global>{`
        :root{
          --chrome-h:56px; --tabbar-h:64px;
          --lg-blur:14px; --lg-sat:150%; --lg-regular:.20; --lg-clear:.08; --lg-brd:.26;
        }
        .lg-chrome{position:fixed; inset-inline:0; z-index:1000; pointer-events:none}
        .lg-chrome *{pointer-events:auto}

        .lg-top{top:0; padding:8px 12px; height:var(--chrome-h); display:flex; align-items:center; justify-content:center}
        .lg-bar{
          width:min(100%,1100px); border-radius:12px; padding:10px 12px;
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          border:1px solid rgba(255,255,255,var(--lg-brd));
          -webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
                  backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
          background:rgba(255,255,255,var(--lg-clear));
          box-shadow:0 14px 32px rgba(0,0,0,.28);
          transition:background .25s ease;
        }
        .scrolled .lg-bar{ background:rgba(255,255,255,var(--lg-regular)); }

        .lg-bottom{bottom:0; padding:8px 12px; height:var(--tabbar-h); display:flex; align-items:flex-start; justify-content:center}
        .lg-tab{
          width:min(100%,560px); border-radius:14px; padding:8px;
          display:flex; align-items:center; justify-content:space-around;
          border:1px solid rgba(255,255,255,var(--lg-brd));
          -webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
                  backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
          background:rgba(255,255,255,var(--lg-clear));
          box-shadow:0 14px 32px rgba(0,0,0,.28);
        }
        .lg-tab a{color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px}
        .lg-tab a.is-active{background:rgba(255,255,255,.14)}
      `}</style>

      <div className="lg-chrome" aria-hidden="false">
        <header ref={topRef} className="lg-top" aria-label="شريط علوي">
          <div className="lg-bar">
            <strong style={{ fontWeight: 900, fontSize: 16 }}>Smart — Liquid</strong>
            <nav style={{ display: "flex", gap: 8 }}>
              <a className="lg-btn" href="#">بحث</a>
              <a className="lg-btn" href="#">حساب</a>
              <a className="lg-btn" href="#">سلة</a>
            </nav>
          </div>
        </header>

        {/* اختياري: لو لا تريد التاب السفلي لاحقًا أخبرني وأرسل نسخة بدونه */}
        <footer className="lg-bottom" aria-label="تاب بار">
          <nav className="lg-tab">
            <a className="is-active" href="#">الرئيسية</a>
            <a href="#">المفضلة</a>
            <a href="#">السلة</a>
            <a href="#">الحساب</a>
          </nav>
        </footer>
      </div>
    </>
  );
}
