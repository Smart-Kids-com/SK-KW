"use client";

import Link from "next/link";
import HomepageSlideshow from "@/components/HomepageSlideshow";
import HomeSlider from "@/components/HomeSlider";
import {
  slidesPrimary,
  slidesSecondary,
  videos,
  banners,
  featuredHandles,
  AUTOPLAY_MS,
} from "@/lib/homepageData";

// --- Helpers ---
function stripHtml(html = "") {
  return (html || "").replace(/<[^>]*>?/gm, "");
}

function ImageBanner({ src, heading, sub, ctaLabel, ctaHref }) {
  if (!src) return null;
  return (
    <section style={{ marginBottom: "3rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1rem" }}>
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            minHeight: "360px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
          }}
        >
          <img
            src={src}
            alt={stripHtml(heading || "") || "banner"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
          />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", color: "white", padding: "2rem" }}>
            {heading && (
              <h2 style={{ fontSize: "2rem", marginBottom: "0.75rem", fontWeight: 800 }}>
                {stripHtml(heading)}
              </h2>
            )}
            {sub && (
              <p style={{ fontSize: "1.1rem", opacity: 0.95, marginBottom: "1.25rem" }}>
                {stripHtml(sub)}
              </p>
            )}
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  backgroundColor: "#fff",
                  color: "#7c1d8a",
                  textDecoration: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ src, title }) {
  if (!src) return null;
  const isYouTube = /youtu\.be|youtube\.com/.test(src);
  const toYouTubeEmbed = (u) => {
    try {
      if (u.includes('youtu.be/')) {
        const id = u.split('youtu.be/')[1].split(/[?&]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
      }
      const url = new URL(u);
      const id = url.searchParams.get('v') || (url.pathname.includes('/shorts/') ? url.pathname.split('/shorts/')[1].split(/[?&]/)[0] : null);
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
    } catch { return null; }
  };
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "16 / 9" }}>
          {isYouTube ? (
            <iframe
              src={toYouTubeEmbed(src) || src}
              title={title || "Smart Kids Video"}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video
              src={src}
              controls
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              title={title || "Smart Kids Video"}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <style jsx>{`
        :root {
          --color-background: #370e3e;
          --color-foreground: #ffffff;
          --color-button: #9422af;
          --color-button-text: #ffffff;
          --color-secondary-button: #710d43;
          --color-link: #9422af;
          --color-shadow: 0,0,0;
          --font-body-family: 'Amiri', serif;
          --font-heading-family: 'Assistant', sans-serif;
          --font-body-scale: 1.2;
          --font-heading-scale: 1.1;
          --page-width: 100%;
          --spacing-sections: 2rem;
          --spacing-grid-horizontal: 1rem;
          --spacing-grid-vertical: 1rem;
          --buttons-radius: 4px;
          --media-radius: 10px;
          --card-corner-radius: 6px;
          --buttons-shadow-opacity: 0.45;
          --buttons-shadow-horizontal-offset: 8px;
          --buttons-shadow-vertical-offset: 8px;
          --buttons-shadow-blur: 15px;
          --card-shadow-opacity: 0.25;
        }
        @media (min-width: 990px) {
          :root {
            --page-width: 1600px;
            --spacing-sections: 4rem;
            --spacing-grid-horizontal: 28px;
            --spacing-grid-vertical: 28px;
          }
        }
      `}</style>

      <main
        style={{
          direction: "rtl",
          fontFamily: "var(--font-body-family)",
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
          fontSize: "calc(1rem * var(--font-body-scale))",
          lineHeight: 1.6,
        }}
      >
        {/* 1) الهيرو سلايدر */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
            <HomepageSlideshow slides={slidesPrimary} autoplayMs={AUTOPLAY_MS} />
          </div>
        </section>

        {/* 2) الهيرو سلايدر */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
            <HomepageSlideshow slides={slidesSecondary} autoplayMs={AUTOPLAY_MS} title="عروض و أقسام مختارة" />
          </div>
        </section>

        {/* 3) فيديوهات */}
        {Object.values(videos).map((src, i) => (
          <VideoBlock key={`v-${i}`} src={src} />
        ))}

        {/* 4) بانرات */}
        <ImageBanner
          src={banners.image_banner}
          heading="تصفح المكتبة الصوتية"
          sub=""
          ctaLabel="استكشف الآن"
          ctaHref="/collections"
        />
        <ImageBanner
          src={banners.image_banner_k6GzWz}
          heading="تصفح عرض الــ 12 قصة"
          sub=""
          ctaLabel="اذهب للمجموعة"
          ctaHref="/products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً"
        />

        {/* 5) أقسام المجموعات المختارة */}
        {featuredHandles.map((f) => (
          <section key={f.id} style={{ marginBottom: "var(--spacing-sections)" }}>
            <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
              <div style={{
                textAlign: "center",
                padding: "2rem 2rem",
                backgroundColor: "#f8f9fa",
                borderRadius: 16,
                border: "1px solid rgba(148,34,175,.08)",
              }}>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "0.6rem", color: "#2d3748", fontWeight: 800 }}>
                  {f.title}
                </h2>
                <Link
                  href={`/collections/${encodeURIComponent(f.handle)}`}
                  style={{
                    display: "inline-block",
                    padding: "0.75rem 2rem",
                    backgroundColor: "#9422af",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  عرض المجموعة
                </Link>
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
