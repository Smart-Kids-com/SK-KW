"use client";

import { useEffect, useRef, useState } from "react";

export default function OverlayChrome() {
  const [mounted, setMounted] = useState(false);
  const topRef = useRef(null);

  // لا نرندر أي شيء على السيرفر — ننتظر لما يركب على المتصفح
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const el = topRef.current;
    if (!el) return;

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > 4) el.classList.add("scrolled");
      else el.classList.remove("scrolled");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // طبّق الحالة فورًا
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  if (!mounted) return null; // منع الـ SSR لتجنّب عدم التطابق

  return (
    <>
      <style>{`
        :root{
          --chrome-h:56px;
          --lg-blur:14px; --lg-sat:150%;
          --lg-regular:.20; --lg-clear:.08; --lg-brd:.26;
        }

        /* طبقة التأثير فوق الكل ولا تمنع اللمس */
        .lg-chrome{ position:fixed; left:0; right:0; top:0; z-index:2147483647; pointer-events:none; }

        .lg-top{
          position:fixed; top:0; left:0; right:0;
          padding:8px 12px; height:var(--chrome-h);
          display:flex; align-items:center; justify-content:center;
          transition: background .25s ease;
        }

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

        /* تغميق خفيف عند التمرير */
        .scrolled .lg-bar{ background: rgba(255,255,255,var(--lg-regular)); }

        /* موبايل */
        @media (max-width:640px){
          :root{ --chrome-h:52px; }
          .lg-top{ padding-top: calc(env(safe-area-inset-top) + 6px); padding-inline:8px; }
          .lg-bar{ padding:8px 10px; border-radius:10px; }
        }
      `}</style>

      <div className="lg-chrome" aria-hidden="true">
        <header ref={topRef} className="lg-top">
          <div className="lg-bar"></div>
        </header>
      </div>
    </>
  );
}
