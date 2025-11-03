// app/page.js
"use client";

import Link from "next/link";
import Image from "next/image";
import HomepageSlideshow from "@/components/HomepageSlideshow";
import ProductsCarousel from "@/components/ProductsCarousel";

import {
  slidesPrimary,
  slidesSecondary,
  videos,
  banners,
  featuredHandles,
  AUTOPLAY_MS,
} from "@/lib/homepageData";

// ------- Helpers -------
const H = (h) => encodeURIComponent(h || "");
const stripHtml = (html = "") => (html || "").replace(/<[^>]*>?/gm, "");

// ------- UI Pieces -------
function ImageBanner({ src, heading, sub, ctaLabel, ctaHref }) {
  if (!src) return null;
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div
        style={{
          maxWidth: "var(--page-width)",
          margin: "0 auto",
          padding: "0 var(--spacing-grid-horizontal)",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            // نسبة أبعاد ثابتة: 21:9 (شكل بانر عريض)
            aspectRatio: "21 / 9",
            background:
              "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
          }}
        >
          {/* الصورة ثابتة بملىء الحاوية */}
          <Image
            src={src}
            alt={stripHtml(heading || "banner")}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            style={{ objectFit: "cover", opacity: 0.9 }}
            priority={false}
          />
          {/* محتوى فوق الصورة */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: "#fff",
              padding: "2rem",
              backdropFilter: "none",
            }}
          >
            <div>
              {heading ? (
                <h2
                  style={{
                    fontSize: "clamp(1.4rem, 3vw, 2rem)",
                    marginBottom: ".75rem",
                    fontWeight: 800,
                  }}
                >
                  {stripHtml(heading)}
                </h2>
              ) : null}
              {sub ? (
                <p
                  style={{
                    fontSize: "clamp(1rem, 2.2vw, 1.1rem)",
                    opacity: 0.95,
                    marginBottom: "1.25rem",
                  }}
                >
                  {stripHtml(sub)}
                </p>
              ) : null}
              {ctaLabel && ctaHref ? (
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
              ) : null}
            </div>
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
      if (u.includes("youtu.be/")) {
        const id = u.split("youtu.be/")[1].split(/[?&]/)[0];
        return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
      }
      const url = new URL(u);
      const id =
        url.searchParams.get("v") ||
        (url.pathname.includes("/shorts/")
          ? url.pathname.split("/shorts/")[1].split(/[?&]/)[0]
          : null);
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
    } catch {
      return null;
    }
  };
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div
        style={{
          maxWidth: "var(--page-width)",
          margin: "0 auto",
          padding: "0 var(--spacing-grid-horizontal)",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            background: "#000",
            aspectRatio: "16 / 9",
          }}
        >
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

// ------- Page -------
export default function HomePage() {
  return (
    <>
      <style jsx>{`
        :root {
          --color-background: #370e3e;
          --color-foreground: #ffffff;
          --color-link: #9422af;

          --page-width: 100%;
          --spacing-sections: 2rem;
          --spacing-grid-horizontal: 1rem;
          --spacing-grid-vertical: 1rem;
        }
        @media (min-width: 990px) {
          :root {
            --page-width: 1600px;
            --spacing-sections: 3.2rem;
            --spacing-grid-horizontal: 28px;
            --spacing-grid-vertical: 28px;
          }
        }
      `}</style>

      <main
        style={{
          direction: "rtl",
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
          lineHeight: 1.6,
        }}
      >
        {/* 1) سلايدر رئيسي */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div
            style={{
              maxWidth: "var(--page-width)",
              margin: "0 auto",
              padding: "0 var(--spacing-grid-horizontal)",
            }}
          >
            <HomepageSlideshow slides={slidesPrimary} autoplayMs={AUTOPLAY_MS} />
          </div>
        </section>

        {/* 2) سلايدر ثانوي */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div
            style={{
              maxWidth: "var(--page-width)",
              margin: "0 auto",
              padding: "0 var(--spacing-grid-horizontal)",
            }}
          >
            <HomepageSlideshow
              slides={slidesSecondary}
              autoplayMs={AUTOPLAY_MS}
              title="عروض و أقسام مختارة"
            />
          </div>
        </section>

        {/* 3) فيديوهات (من Shopify CDN) */}
        {(Object.values(videos || {}) || []).map((src, i) => (
          <VideoBlock key={`v-${i}`} src={src} />
        ))}

        {/* 4) بانرات صور بمقاسات منضبطة */}
        <ImageBanner
          src={banners?.image_banner}
          heading="تصفح المكتبة الصوتية"
          sub=""
          ctaLabel="استكشف الآن"
          ctaHref="/collections"
        />
        <ImageBanner
          src={banners?.image_banner_k6GzWz}
          heading="تصفح عرض الــ 12 قصة"
          sub=""
          ctaLabel="اذهب للمجموعة"
          ctaHref={`/products/${H("حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً")}`}
        />

        {/* 5) مجموعات مختارة + شريط منتجات مصغّر لكل مجموعة */}
        {(featuredHandles || []).map((f) => (
          <section key={f.id} style={{ marginBottom: "var(--spacing-sections)" }}>
            <div
              style={{
                maxWidth: "var(--page-width)",
                margin: "0 auto",
                padding: "0 var(--spacing-grid-horizontal)",
              }}
            >
              {/* رأس المجموعة + زر الدخول */}
              <div
                style={{
                  textAlign: "center",
                  padding: "1.5rem 1rem",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "clamp(1.3rem, 2.8vw, 1.8rem)",
                    marginBottom: ".6rem",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  {f.title}
                </h2>
                <Link
                  href={`/collections/${H(f.handle)}`}
                  style={{
                    display: "inline-block",
                    padding: "0.6rem 1.4rem",
                    backgroundColor: "#9422af",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  عرض المجموعة
                </Link>
              </div>

              {/* شريط المنتجات المصغّر للمجموعة */}
              <ProductsCarousel
                title={null}
                collectionHandle={f.handle}
                limit={8} // لو غير مدعومة في الكمبوننت، سيتجاهلها بدون مشاكل
              />
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
