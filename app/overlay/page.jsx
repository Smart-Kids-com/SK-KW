"use client";

import { useEffect, useRef } from "react";

export default function Page() {
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
    <div dir="rtl" lang="ar">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap");

        :root{
          --chrome-h:56px; --tabbar-h:64px;
          --bg-0:#0f0a17; --bg-1:#1a1226; --ink:#fff;
          --lg-blur:14px; --lg-sat:150%; --lg-regular:.20; --lg-clear:.08; --lg-brd:.26;
        }
        *{box-sizing:border-box}
        html,body{margin:0}
        body{font-family:"Cairo",system-ui,-apple-system,Segoe UI,Roboto,sans-serif; line-height:1.65}

        /* خلفية عامة */
        .wrap{
          min-height:100svh;
          background:
            radial-gradient(900px 520px at 85% -10%, #3a2163 0%, rgba(58,33,99,0) 60%),
            linear-gradient(180deg, var(--bg-1), var(--bg-0));
          color:var(--ink);
        }

        /* طبقة Overlay فقط */
        .chrome{position:fixed; inset-inline:0; z-index:1000; pointer-events:none}
        .chrome *{pointer-events:auto}

        .top{top:0; padding:8px 12px; height:var(--chrome-h); display:flex; align-items:center; justify-content:center}
        .bar{
          width:min(100%,1100px); border-radius:12px; padding:10px 12px;
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          border:1px solid rgba(255,255,255,var(--lg-brd));
          -webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
                  backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
          background:rgba(255,255,255,var(--lg-clear));
          box-shadow:0 14px 32px rgba(0,0,0,.28);
          transition:background .25s ease;
        }
        .scrolled .bar{ background:rgba(255,255,255,var(--lg-regular)); }

        .bottom{bottom:0; padding:8px 12px; height:var(--tabbar-h); display:flex; align-items:flex-start; justify-content:center}
        .tab{
          width:min(100%,560px); border-radius:14px; padding:8px;
          display:flex; align-items:center; justify-content:space-around;
          border:1px solid rgba(255,255,255,var(--lg-brd));
          -webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
                  backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));
          background:rgba(255,255,255,var(--lg-clear));
          box-shadow:0 14px 32px rgba(0,0,0,.28);
        }
        .tab a{color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px}
        .tab a.is-active{background:rgba(255,255,255,.14)}

        /* محتوى تحت الـ overlay (بدون منتجات) */
        .content{ padding-top:calc(var(--chrome-h) + 12px); padding-bottom:calc(var(--tabbar-h) + 16px); }
        .container{ max-width:1100px; margin:0 auto; padding:24px 16px; }
        .card{
          border-radius:16px; padding:16px;
          background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
        }

        /* مساحة تمرير لتجربة التأثير */
        .spacer{ height:160vh }
      `}</style>

      <div className="wrap">
        {/* Overlay */}
        <div className="chrome">
          <header ref={topRef} className="top" aria-label="شريط علوي">
            <div className="bar">
              <strong style={{ fontWeight: 900, fontSize: 16 }}>Smart — Liquid</strong>
              <nav style={{ display: "flex", gap: 8 }}>
                <a className="btn" href="#">بحث</a>
                <a className="btn" href="#">حساب</a>
                <a className="btn" href="#">سلة</a>
              </nav>
            </div>
          </header>

          <footer className="bottom" aria-label="تاب بار">
            <nav className="tab">
              <a className="is-active" href="#">الرئيسية</a>
              <a href="#">المفضلة</a>
              <a href="#">السلة</a>
              <a href="#">الحساب</a>
            </nav>
          </footer>
        </div>

        {/* محتوى تجريبي بسيط فقط */}
        <main className="content" aria-label="المحتوى">
          <div className="container">
            <div className="card">
              <h1 style={{margin:"0 0 .5rem", fontWeight:900}}>تأثير Liquid Overlay</h1>
              <p style={{margin:0, opacity:.9}}>
                هذا مجرد محتوى بسيط لاختبار التأثير. مرّر الصفحة لأعلى/أسفل لتلاحظ تغيّر شريط الأعلى.
              </p>
            </div>

            <div className="spacer" aria-hidden="true" />
          </div>
        </main>
      </div>
    </div>
  );
}
