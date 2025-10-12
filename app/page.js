// app/page.js
// Server Component فقط — بدون أي كود عميل أو hooks لمنع أخطاء Next
import Link from "next/link";
import {
  slidesPrimary,
  slidesSecondary,
  banners,
  videos,
  featuredHandles,
} from "@/app/HomepageData";
import { getCollectionByHandle, formatKWD } from "@/lib/shopify";

// Helpers
const enc = (s) => encodeURIComponent(s || "");
const safeHref = (href) => (href?.startsWith("/") ? href : `/${href || ""}`);

// بطاقة منتج بسيطة
function ProductCard({ p }) {
  const min = p?.priceRange?.minVariantPrice?.amount;
  const max = p?.priceRange?.maxVariantPrice?.amount;
  const price =
    min != null
      ? formatKWD(Number(min)) +
        (max != null && max !== min ? ` - ${formatKWD(Number(max))}` : "")
      : "";

  return (
    <>
      <Link
        href={`/products/${enc(p.handle)}`}
        aria-label={p.title}
        style={styles.card}
      >
        <div style={styles.cardImg}>
          {p.featuredImage?.url ? (
            <img
              src={p.featuredImage.url}
              alt={p.featuredImage.altText || p.title}
              style={styles.cardImgTag}
              loading="lazy"
            />
          ) : (
            <div style={styles.cardImgPh}>📦</div>
          )}
        </div>
        <div style={styles.cardInfo}>
          <h3 style={styles.cardTitle}>{p.title}</h3>
          {price && <div style={styles.cardPrice}>{price}</div>}
        </div>
      </Link>
    </>
  );
}

// شريحة سلايدر بسيطة (بدون أوتوبلاي لتفادي الكلاينت)
function Slide({ s }) {
  return (
    <Link href={safeHref(s.link)} aria-label="slide" style={styles.slide}>
      <div style={styles.slideImgWrap}>
        <img src={s.image} alt="slide" style={styles.slideImg} />
      </div>
      {(s.heading || s.subheading || s.button_label) && (
        <div style={styles.slideText}>
          {s.heading && (
            <div
              style={styles.slideHeading}
              dangerouslySetInnerHTML={{ __html: s.heading }}
            />
          )}
          {s.subheading && (
            <div
              style={styles.slideSub}
              dangerouslySetInnerHTML={{ __html: s.subheading }}
            />
          )}
          {s.button_label && (
            <span style={{ ...styles.btn, ...styles.btnGhost }}>
              {s.button_label}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  // اجلب المجموعات البارزة بنفس الترتيب
  const featured = await Promise.all(
    featuredHandles.map(async (f) => {
      const c = await getCollectionByHandle(f.handle, 16);
      return { meta: f, collection: c };
    })
  );

  return (
    <main dir="rtl" style={styles.main}>
      {/* سلايدر 1 */}
      <section style={styles.section}>
        <div style={styles.scrollerSlides}>
          {slidesPrimary.map((s, i) => (
            <Slide key={`p-${i}`} s={s} />
          ))}
        </div>
      </section>

      {/* سلايدر 2 */}
      <section style={styles.section}>
        <div style={{ ...styles.scrollerSlides, gridAutoColumns: "minmax(320px,1fr)" }}>
          {slidesSecondary.map((s, i) => (
            <Slide key={`s-${i}`} s={s} />
          ))}
        </div>
      </section>

      {/* فيديوهات */}
      {videos.video_XrwaL && (
        <section style={styles.section}>
          <h2 style={styles.h}>
            <strong>المسلم الصغير 4 كتب صوتية للأطفال 🔊</strong>
          </h2>
          <video
            src={videos.video_XrwaL}
            controls
            playsInline
            autoPlay
            muted
            loop
            style={styles.video}
          />
        </section>
      )}
      {videos.video_fPhkf && (
        <section style={styles.section}>
          <video
            src={videos.video_fPhkf}
            controls
            playsInline
            autoPlay
            muted
            loop
            style={styles.video}
          />
        </section>
      )}

      {/* بانرات */}
      {banners.image_banner && (
        <section style={styles.section}>
          <Link href="/collections/قصصي-الصوتية-المسموعة">
            <img
              src={banners.image_banner}
              alt="banner"
              style={styles.banner}
            />
          </Link>
          <div style={styles.center}>
              <Link href="/collections/قصصي-الصوتية-المسموعة" style={{ ...styles.btn, ...styles.btnGhost }}>
                تصفح المكتبة الصوتية
              </Link>
            </div>
        </section>
      )}

      {banners.image_banner_k6GzWz && (
        <section style={styles.section}>
          <Link href="/products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً">
            <img
              src={banners.image_banner_k6GzWz}
              alt="banner"
              style={styles.banner}
            />
          </Link>
          <div style={styles.center}>
            <Link
              href="/products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً"
              style={styles.btn}
            >
              تصفح عرض ال 12 قصة تفاعلية
            </Link>
          </div>
        </section>
      )}

      {/* Collections المميزة */}
      {featured.map(({ meta, collection }, i) => {
        const prods = collection?.products || [];
        if (!prods.length) return null;
        return (
          <section key={meta.id || i} style={styles.section}>
            {meta.title && (
              <h2
                style={styles.h}
                dangerouslySetInnerHTML={{ __html: meta.title }}
              />
            )}
            <div style={styles.scrollerProds}>
              {prods.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
            <div style={styles.center}>
              <Link
                href={`/collections/${enc(collection.handle)}`}
                style={{ ...styles.btn, ...styles.btnGhost }}
              >
                عرض الكل
              </Link>
            </div>
          </section>
        );
      })}
      {/* Close main tag */}
    </main>
  );
}

/* ====== ستايلات بسيطة inline لتفادي styled-jsx وأي client-only ====== */
const styles = {
  main: {
    "--accent": "#7c1d8a",
    "--accent2": "#5d1568",
    background: "#f8f9fa",
  },
  section: { padding: "14px 10px" },
  h: {
    margin: "0 0 10px",
    textAlign: "center",
    fontWeight: 800,
    fontSize: "clamp(1.3rem,2.4vw,1.9rem)",
    color: "#2d3748",
  },
  scrollerSlides: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(280px,1fr)",
    gap: "14px",
    overflowX: "auto",
    padding: "8px 8px",
    scrollSnapType: "x mandatory",
  },
  slide: {
    scrollSnapAlign: "start",
    display: "block",
    textDecoration: "none",
    color: "inherit",
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
    position: "relative",
  },
  slideImgWrap: { position: "relative", paddingBottom: "48%", background: "#f1eef3" },
  slideImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  slideText: {
    position: "absolute",
    insetInline: 10,
    bottom: 10,
    background: "rgba(0,0,0,.35)",
    color: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    backdropFilter: "saturate(140%) blur(6px)",
  },
  slideHeading: { fontWeight: 800, marginBottom: 4 },
  slideSub: { opacity: 0.9, fontSize: ".95rem" },
  banner: { width: "100%", height: "auto", borderRadius: 18, display: "block" },
  video: { width: "100%", maxWidth: 1280, borderRadius: 16, display: "block", margin: "8px auto 0" },
  center: { textAlign: "center", marginTop: 8 },
  scrollerProds: {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(200px,1fr)",
    gap: "12px",
    overflowX: "auto",
    padding: "6px 6px",
    scrollSnapType: "x mandatory",
  },
  card: {
    scrollSnapAlign: "start",
    display: "block",
    textDecoration: "none",
    color: "inherit",
    background: "#fff",
    border: "1px solid rgba(0,0,0,.08)",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImg: { position: "relative", paddingBottom: "100%", background: "#f5f4f6", display: "grid", placeItems: "center" },
  cardImgTag: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  cardImgPh: { fontSize: "2rem" },
  cardInfo: { padding: "10px 12px 12px" },
  cardTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: "1rem",
    lineHeight: 1.4,
    color: "#2d3748",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardPrice: { fontWeight: 800, color: "var(--accent)" },
};