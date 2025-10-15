"use client";

import { useEffect, useRef } from "react";

export default function OverlayChrome() {
  const topRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = topRef.current;
    if (!el) return;

    const THRESHOLD = 120; // يظهر بعد 120px تمرير

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      // تبديل حالتين: نشِط/غير نشِط + تغميق بسيط
      if (y > THRESHOLD) {
        el.classList.add("active");
        el.classList.add("scrolled");
      } else {
        el.classList.remove("active");
        if (y <= 4) el.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        :root{
          --chrome-h:56px;
          --lg-blur:14px; --lg-sat:150%;
          --lg-regular:.20; --lg-clear:.08; --lg-brd:.26;
        }

        /* طبقة التأثير فقط (لا تمنع اللمس) */
        .lg-chrome{ position:fixed; left:0; right:0; z-index:9999; pointer-events:none; }

        /* الشريط العلوي */
        .lg-top{
          position:fixed; top:0; left:0; right:0;
          padding:8px 12px; height:var(--chrome-h);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transform: translateY(-10px);
          transition: opacity .25s ease, transform .25s ease;
        }
        /* يظهر بعد التمرير */
        .lg-top.active{ opacity:1; transform: translateY(0); }

        .lg-bar{
          width:min(100%,1100px);
          border-radius:12px; padding:10px 12px;
          border:1px solid rgba(255,255,255,var(--lg-brd));
          -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
                  backdrop-filter:  blur(var(--lg-blur)) saturate(var(--lg-sat));
          background: rgba(255,255,255,var(--lg-clear));
          box-shadow: 0 14px 32px rgba(0,0,0,.28);
          transition: background .25s ease;
        }
        /* تغميق خفيف */
        .scrolled .lg-bar{ background: rgba(255,255,255,var(--lg-regular)); }

        /* لا نص ولا أزرار إطلاقًا */
        .lg-bar > *{ display:none !important; }

        /* موبايل */
        @media (max-width:640px){
          :root{ --chrome-h:52px; }
          .lg-top{ padding-top: calc(env(safe-area-inset-top) + 6px); padding-inline:8px; }
          .lg-bar{ padding:8px 10px; border-radius:10px; }
        }

        /* إخفاء التأثير بالكامل */
        .lg-chrome{ display: none !important; }
      `}</style>

      {/* شريط زجاجي بصري فقط */}
      <div className="lg-chrome" aria-hidden="true">
        <header ref={topRef} className="lg-top">
          <div className="lg-bar"></div>
        </header>
      </div>
    </>
  );
}
