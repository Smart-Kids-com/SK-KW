import Link from "next/link";
import HomepageSlideshow from "@/components/HomepageSlideshow";
import ProductsCarousel from "@/components/ProductsCarousel";
import { getCollectionByHandle } from "@/lib/shopify";
import {
  slidesPrimary,
  slidesSecondary,
  videos,
  banners,
  featuredHandles,
  AUTOPLAY_MS,
} from "@/lib/homepageData";

/* Helpers */
const stripHtml = (html = "") => (html || "").replace(/<[^>]*>?/gm, "");

function AspectBox({ ratio = "1 / 1", children, bg = "#370E3E", radius = 16 }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: "hidden",
        background: bg,
      }}
    >
      {children}
    </div>
  );
}

function ImageBanner({ src, heading, sub, ctaLabel, ctaHref, ratio = "1 / 1" }) {
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
        <AspectBox
          ratio={ratio}
          bg="linear-gradient(135deg, #370E3E 0%, #7c1d8a 100%)"
        >
          <img
            src={src}
            alt={stripHtml(heading || "") || "banner"}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.9,
            }}
            loading="lazy"
          />
          {(heading || sub || (ctaLabel && ctaHref)) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
                {heading && (
                  <h2
                    style={{
                      fontSize: "2rem",
                      marginBottom: ".75rem",
                      fontWeight: 800,
                    }}
                  >
                    {stripHtml(heading)}
                  </h2>
                )}
                {sub && (
                  <p
                    style={{
                      fontSize: "1.1rem",
                      opacity: 0.95,
                      marginBottom: "1.25rem",
                    }}
                  >
                    {stripHtml(sub)}
                  </p>
                )}
                {ctaLabel && ctaHref && (
                  <Link
                    href={ctaHref}
                    style={{
                      display: "inline-block",
                      padding: ".75rem 2rem",
                      backgroundColor: "#370E3E",
                      color: "#fff",
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
          )}
        </AspectBox>
      </div>
    </section>
  );
}

function VideoBlock({ src, title, ratio = "1 / 1" }) {
  if (!src) return null;
  const isYouTube = /youtu\.be|youtube\.com/.test(src);
  return (
    <section style={{ marginBottom: "var(--spacing-sections)" }}>
      <div
        style={{
          maxWidth: "var(--page-width)",
          margin: "0 auto",
          padding: "0 var(--spacing-grid-horizontal)",
        }}
      >
        <AspectBox ratio={ratio}>
          {isYouTube ? (
            <iframe
              src={src}
              title={title || "Smart Kids Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          ) : (
            <video
              src={src}
              controls
              playsInline
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </AspectBox>
      </div>
    </section>
  );
}

async function loadCollectionsForHomepage(handles = [], limit = 12) {
  const list = [];
  for (const f of handles) {
    const col = await getCollectionByHandle(f.handle, limit);
    const products = (col?.products || []).map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      imageUrl: p.featuredImage?.url || (p.images?.[0]?.url || null),
      imageAlt: p.featuredImage?.altText || p.title,
      price: p.priceRange?.minVariantPrice
        ? `${Number(p.priceRange.minVariantPrice.amount).toFixed(3)} ${p.priceRange.minVariantPrice.currencyCode}`
        : null,
    }));
    list.push({ ...f, products });
  }
  return list;
}

export default async function HomePage() {
  const vids = Object.values(videos || {});
  const v1 = vids[0] || null; // 1:1
  const v2 = vids[1] || null; // 9:16

  const collections = await loadCollectionsForHomepage(featuredHandles, 12);

  return (
    <>
      <style>{`
        :root {
          --color-background: #370e3e;
          --color-foreground: #f8a2f5ff;
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
        {/* سلايدر 1 */}
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

        {/* سلايدر 2 */}
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

        {/* فيديوهات وبنرات */}
        {v1 && <VideoBlock src={v1} ratio="1 / 1" />}
        {v2 && <VideoBlock src={v2} ratio="9 / 16" />}

        <ImageBanner
          src={banners.image_banner}
          heading=""
          sub=""
          ctaLabel="تصفح المكتبة الصوتية"
          ctaHref="/collections"
          ratio="1 / 1"
        />
        <ImageBanner
          src={banners.image_banner_k6GzWz}
          heading=""
          sub=""
          ctaLabel="تصفح عرض ال 12 قصة"
          ctaHref={`/products/${encodeURIComponent("حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً")}`}
          ratio="1 / 1"
        />

        {/* مجموعات + كاروسيل منتجات */}
        {collections.map((c) => (
          <section key={c.id} style={{ marginBottom: "var(--spacing-sections)" }}>
            <div
              style={{
                maxWidth: "var(--page-width)",
                margin: "0 auto",
                padding: "0 var(--spacing-grid-horizontal)",
              }}
            >
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
                <h2
                  style={{
                    fontSize: "clamp(1.2rem, 2.2vw, 1.8rem)",
                    marginBottom: ".35rem",
                    fontWeight: 800,
                  }}
                >
                  {c.title}
                </h2>

                <Link
                  href={`/collections/${encodeURIComponent(c.handle)}`}
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
                  مشاهدة الكل
                </Link>
              </div>
            </div>

            <div
              style={{
                maxWidth: "var(--page-width)",
                margin: "0 auto",
                padding: "0 var(--spacing-grid-horizontal)",
              }}
            >
              <ProductsCarousel
                products={c.products}
                title={c.title}
                viewAllHref={`/collections/${encodeURIComponent(c.handle)}`}
              />
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
