import Link from "next/link";
import HomepageSlideshow from "@/components/HomepageSlideshow";
import FeaturedCollectionGrid from "@/components/FeaturedCollectionGrid";
import {
  slidesPrimary,
  slidesSecondary,
  videos,
  banners,
  featuredHandles,
  AUTOPLAY_MS,
} from "@/lib/homepageData";

const stripHtml = (html = "") => (html || "").replace(/<[^>]*>?/gm, "");

function ImageBanner({ src, heading, sub, ctaLabel, ctaHref }) {
  if (!src) return null;
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            minHeight: 360,
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
            loading="lazy"
          />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", color: "white", padding: "2rem" }}>
            {heading && <h2 style={{ fontSize: "2rem", marginBottom: ".75rem", fontWeight: 800 }}>{stripHtml(heading)}</h2>}
            {sub && <p style={{ fontSize: "1.1rem", opacity: 0.95, marginBottom: "1.25rem" }}>{stripHtml(sub)}</p>}
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                style={{
                  display: "inline-block",
                  padding: ".75rem 2rem",
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
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
        <style jsx>{`
          .sk-video {
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            border-radius: 16px;
            overflow: hidden;
            background: #000;
          }
          @media (max-width: 740px) {
            .sk-video { aspect-ratio: 4/5; }
          }
          .sk-video > :global(iframe), .sk-video > :global(video) {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
            object-fit: cover;
          }
        `}</style>
        <div className="sk-video">
          {/youtu\.be|youtube\.com/.test(src) ? (
            <iframe
              src={src}
              title={title || "Smart Kids Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video src={src} controls playsInline />
          )}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  return (
    <>
      <style jsx>{`
        :root {
          --color-background: #370e3e;
          --color-foreground: #ffffff;
          --page-width: 100%;
          --spacing-sections: 2rem;
          --spacing-grid-horizontal: 1rem;
        }
        @media (min-width: 990px) {
          :root {
            --page-width: 1600px;
            --spacing-sections: 3.5rem;
            --spacing-grid-horizontal: 28px;
          }
        }
      `}</style>

      <main
        dir="rtl"
        style={{
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
          lineHeight: 1.6,
        }}
      >
        {/* Slideshow 1 */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
            <HomepageSlideshow slides={slidesPrimary} autoplayMs={AUTOPLAY_MS} />
          </div>
        </section>

        {/* Slideshow 2 */}
        <section style={{ marginBottom: "var(--spacing-sections)" }}>
          <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
            <HomepageSlideshow slides={slidesSecondary} autoplayMs={AUTOPLAY_MS} title="عروض و أقسام مختارة" />
          </div>
        </section>

        {/* Videos */}
        {Object.values(videos).map((src, i) => (
          <VideoBlock key={`v-${i}`} src={src} />
        ))}

        {/* Banners */}
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
          ctaHref={`/products/${encodeURIComponent("حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً")}`}
        />

        {/* مجموعات + منتجاتها */}
        {featuredHandles.map((f) => (
          <section key={f.id} style={{ marginBottom: "var(--spacing-sections)" }}>
            <div style={{ maxWidth: "var(--page-width)", margin: "0 auto", padding: "0 var(--spacing-grid-horizontal)" }}>
              <div
                style={{
                  textAlign: "center",
                  padding: "1.25rem",
                  backgroundColor: "#f8f9fa",
                  borderRadius: 16,
                  border: "1px solid rgba(148,34,175,.08)",
                  color: "#2d3748",
                }}
              >
                <h2 style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.8rem)", marginBottom: ".35rem", fontWeight: 800 }}>
                  {f.title}
                </h2>
                <Link
                  href={`/collections/${encodeURIComponent(f.handle)}`}
                  style={{
                    display: "inline-block",
                    padding: ".55rem 1.3rem",
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
            </div>

            {/* شبكة منتجات المجموعة */}
            <FeaturedCollectionGrid handle={f.handle} limit={8} />
          </section>
        ))}
      </main>
    </>
  );
}