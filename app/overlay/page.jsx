"use client";

import { useEffect, useRef } from "react";

export default function Page() {
  return <OverlayKit />;
}

export function OverlayKit() {
  const topRef = useRef(null);

  useEffect(() => {
    // تأكد أننا على المتصفح وأن العنصر موجود
    if (typeof window === "undefined") return;
    const topEl = topRef.current;
    if (!topEl) return;

    const apply = () => {
      const y =
        (typeof window !== "undefined" ? window.scrollY : 0) ||
        document.documentElement.scrollTop ||
        0;
      if (y > 4) topEl.classList.add("scrolled");
      else topEl.classList.remove("scrolled");
    };

    window.addEventListener("scroll", apply, { passive: true });
    apply();
    return () => window.removeEventListener("scroll", apply);
  }, []);

  return (
    <div dir="rtl" lang="ar">
      {/* تحميل الخط + كل الأنماط داخل الصفحة لتعمل في المعاينة */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap");

        :root {
          --chrome-h: 56px;
          --tabbar-h: 64px;

          --bg-0: #0f0a17;
          --bg-1: #1a1226;
          --ink: #fff;
          --muted: #c9b6d6;
          --brand: #ffd969;

          --lg-blur: 14px;
          --lg-sat: 150%;
          --lg-regular: 0.2;
          --lg-clear: 0.08;
          --lg-brd: 0.26;
          --lg-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);

          --rad: 16px;
        }

        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
        }
        body {
          font-family: "Cairo", system-ui, -apple-system, Segoe UI, Roboto,
            sans-serif;
        }

        .lgp-wrap {
          min-height: 100svh;
          background: radial-gradient(900px 520px at 85% -10%, #3a2163 0%,
              rgba(58, 33, 99, 0) 60%),
            linear-gradient(180deg, var(--bg-1), var(--bg-0));
          color: var(--ink);
          line-height: 1.65;
        }

        /* ===== طبقة التحكم العائمة ===== */
        .lgp-chrome {
          position: fixed;
          inset-inline: 0;
          z-index: 1000;
          pointer-events: none;
        }
        .lgp-chrome * {
          pointer-events: auto;
        }

        .lgp-top {
          top: 0;
          padding-top: env(safe-area-inset-top);
          height: calc(var(--chrome-h) + env(safe-area-inset-top));
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .lgp-top .lgp-bar {
          width: min(100%, 1100px);
          margin: 8px 12px;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, var(--lg-brd));
          -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
          backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
          background: rgba(255, 255, 255, var(--lg-clear));
          box-shadow: var(--lg-shadow);
          transition: background 0.25s ease;
        }
        .lgp-top.scrolled .lgp-bar {
          background: rgba(255, 255, 255, var(--lg-regular));
        }

        .lgp-bottom {
          bottom: 0;
          padding-bottom: env(safe-area-inset-bottom);
          height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }
        .lgp-bottom .lgp-tab {
          width: min(100%, 560px);
          margin: 8px 12px;
          border-radius: 14px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          border: 1px solid rgba(255, 255, 255, var(--lg-brd));
          -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
          backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
          background: rgba(255, 255, 255, var(--lg-clear));
          box-shadow: var(--lg-shadow);
        }
        .lgp-bottom .lgp-tab a {
          color: #fff;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 12px;
        }
        .lgp-bottom .lgp-tab a.is-active {
          background: rgba(255, 255, 255, 0.14);
        }

        /* ===== المحتوى تحت الكروم ===== */
        .lgp-content {
          padding-top: calc(var(--chrome-h) + env(safe-area-inset-top) + 8px);
          padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px);
        }

        .hero {
          max-width: 1100px;
          margin: 0 auto 12px;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 44svh;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.25),
              rgba(0, 0, 0, 0.1)),
            url("https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop")
              center/cover no-repeat;
        }
        .hero .txt {
          position: absolute;
          inset-inline: 16px;
          bottom: 14px;
        }
        .hero h1 {
          margin: 0 0 4px;
          font-weight: 900;
          font-size: clamp(22px, 6.4vw, 32px);
        }
        .hero p {
          margin: 0;
          color: #e9def1;
        }

        .section {
          max-width: 1100px;
          margin: 12px auto;
          display: grid;
          gap: 12px;
        }
        @media (min-width: 720px) {
          .section {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }

        .panel {
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.1);
        }
        .media {
          border-radius: 16px;
          overflow: hidden;
        }
        .media img {
          display: block;
          width: 100%;
          height: auto;
        }
        .price {
          color: var(--brand);
          font-weight: 900;
          margin: 0.2rem 0 1rem;
        }
        .qty {
          display: flex;
          gap: 12px;
          align-items: center;
          margin: 10px 0 14px;
        }
        .box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 160px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: #fff;
          font-weight: 900;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.04)
          );
          -webkit-backdrop-filter: blur(10px) saturate(130%);
          backdrop-filter: blur(10px) saturate(130%);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
          transition: transform 0.12s ease, filter 0.18s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .btn--buy {
          color: #1a1030;
          background: linear-gradient(180deg, #ffd969, #f3c84d);
          border-color: rgba(255, 255, 255, 0.28);
        }

        @media (prefers-reduced-motion: reduce) {
          .lgp-top .lgp-bar {
            transition: none;
          }
          .btn {
            transition: none;
          }
        }
      `}</style>

      {/* ===== الصفحة ===== */}
      <div className="lgp-wrap">
        {/* طبقة التحكم العلوية والسفلية */} 
        <div className="lgp-chrome">
          {/* الشريط العلوي (يُصبح regular عند التمرير) */}
          <header
            ref={topRef}
            id="lgpTop"
            className="lgp-top"
            aria-label="شريط علوي"
          >
            <div className="lgp-bar">
              <strong style={{ fontWeight: 900, fontSize: 16 }}>
                Smart — Liquid
              </strong>
              <nav style={{ display: "flex", gap: 8 }}>
                <a className="btn" href="#">
                  بحث
                </a>
                <a className="btn" href="#">
                  حساب
                </a>
                <a className="btn" href="#">
                  سلة
                </a>
              </nav>
            </div>
          </header>

          {/* تبويب سفلي عائم */}
          <footer className="lgp-bottom" aria-label="تاب بار">
            <nav className="lgp-tab">
              <a className="is-active" href="#">
                الرئيسية
              </a>
              <a href="#">المفضلة</a>
              <a href="#">السلة</a>
              <a href="#">الحساب</a>
            </nav>
          </footer>
        </div>

        {/* المحتوى تحت طبقة التحكم */}
        <main className="lgp-content" aria-label="المحتوى">
          <section className="hero">
            <div className="txt">
              <h1>أصوات الحيوانات — ٤ كتب</h1>
              <p>المحتوى ممتد للحواف… والتحكمات تطفو فوقه.</p>
            </div>
          </section>

          <section className="section">
            <figure className="media">
              <img
                src="https://cdn.shopify.com/s/files/1/0697/3318/7805/files/1967E057-F47A-47E1-BCAE-39E46941D0E8.png?v=1743536340"
                alt="أصوات الحيوانات"
                loading="eager"
                decoding="async"
              />
            </figure>

            <aside className="panel">
              <h2 style={{ margin: "0 0 .25rem" }}>
                أصوات الحيوانات — ٤ كتب
              </h2>
              <div className="price">18.000 KWD</div>
              <div className="qty">
                <span>العدد</span>
                <div className="box">
                  <strong>−</strong>
                  <span>1</span>
                  <strong>+</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="btn" href="#">
                  أضف إلى السلة
                </a>
                <a className="btn btn--buy" href="#">
                  Buy it now
                </a>
              </div>
              <p style={{ marginTop: 10, color: "#d7c6e6" }}>
                لا يوجد ضريبة — سيتم حساب الشحن عند الدفع.
              </p>
            </aside>
          </section>
        </main>

        {/* ارتفاع إضافي لتجربة التمرير في المعاينة/الصفحة */}
        <div style={{ height: "160vh" }} aria-hidden="true" />
      </div>
    </div>
  );
}
