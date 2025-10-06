// app/page.js — Server Component
import Link from "next/link";
import HomepageSlideshow from "../components/HomepageSlideshow";
import ProductsCarousel from "../components/ProductsCarousel";

import {
  slidesPrimary,
  slidesSecondary,
  videos,
  banners,
  featuredHandles,
  AUTOPLAY_MS,
} from "../lib/homepageData";

// === Shopify Storefront fetch (Server-side) ===
async function fetchCollectionProducts(handle, first = 8) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
  if (!domain || !token) return { products: [], error: "Missing Shopify env" };

  const endpoint = `https://${domain}/api/2025-07/graphql.json`;
  const query = `
    query CollectionProducts($handle: String!, $first: Int!) {
      collectionByHandle(handle: $handle) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              images(first: 1) { edges { node { url altText } } }
              priceRange { minVariantPrice { amount currencyCode } }
            }
          }
        }
      }
    }
  `;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { handle, first } }),
    cache: "no-store",
  });

  if (!res.ok) return { products: [], error: `HTTP ${res.status}` };

  const json = await res.json();
  const edges = json?.data?.collectionByHandle?.products?.edges || [];
  const products = edges.map((e) => {
    const n = e.node;
    const img = n.images?.edges?.[0]?.node;
    const price = n.priceRange?.minVariantPrice;
    return {
      id: n.id,
      title: n.title,
      handle: n.handle,
      imageUrl: img?.url || "",
      imageAlt: img?.altText || n.title,
      price: price ? `${Number(price.amount).toFixed(3)} ${price.currencyCode}` : "",
    };
  });
  return { products, error: null };
}

export default async function HomePage() {
  // تحميل منتجات المجموعات المطلوبة بالترتيب
  const collectionsData = await Promise.all(
    featuredHandles.map(async (fc) => {
      const { products, error } = await fetchCollectionProducts(fc.handle, 8);
      return { ...fc, products, error };
    })
  );

  return (
    <>
      {/* 1) السلايدر الأول */}
      <section aria-label="Slideshow primary" style={{ margin: "0 0 24px" }}>
        <HomepageSlideshow slides={slidesPrimary} autoplayMs={AUTOPLAY_MS} />
      </section>

      {/* 2) السلايدر الثاني */}
      <section aria-label="Slideshow secondary" style={{ margin: "0 0 48px" }}>
        <HomepageSlideshow slides={slidesSecondary} autoplayMs={AUTOPLAY_MS} />
      </section>

      {/* 3) فيديو: المسلم الصغير */}
      <section className="video-wrap">
        <h2 className="sec-title">
          <strong>المسلم الصغير 4 كتب صوتية للأطفال</strong> 🔊
        </h2>
        <div className="video-frame">
          <video
            src={videos.video_XrwaL}
            controls
            playsInline
            muted
            loop
            style={{ width: "100%", borderRadius: 16 }}
          />
        </div>
      </section>

      {/* 4) فيديو: قصص الأنبياء (عرض كامل) */}
      <section className="video-wrap full">
        <div className="video-frame">
          <video
            src={videos.video_fPhkf}
            controls
            playsInline
            muted
            loop
            style={{ width: "100%", borderRadius: 0 }}
          />
        </div>
      </section>

      {/* 5) بانر الصورة الثانية + زرين */}
      <section className="banner">
        <img
          src={banners.image_banner_k6GzWz}
          alt="بانر - عروض تفاعلية"
          className="banner-img"
        />
        <div className="banner-ctas">
          <Link href="/collections/قصصي-الصوتية-المسموعة" className="btn btn-outline">
            تصفح المكتبة الصوتية
          </Link>
          <Link
            href="/products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً"
            className="btn btn-outline"
          >
            تصفح عرض ال 12 قصة تفاعلية
          </Link>
        </div>
      </section>

      {/* 6) بانر الصورة الأولى + زر واحد */}
      <section className="banner">
        <img
          src={banners.image_banner}
          alt="بانر - عرض صوتيات"
          className="banner-img"
        />
        <div className="banner-ctas single">
          <Link href="/collections/قصصي-الصوتية-المسموعة" className="btn btn-outline">
            تصفح المكتبة الصوتية
          </Link>
        </div>
      </section>

      {/* 7) أقسام المجموعات (سلايدر منتجات) */}
      {collectionsData.map((fc) => (
        <section key={fc.id} className="collection-block">
          <div className="collection-head">
            <h2 className="sec-title">{fc.title}</h2>
            <Link
              href={`/collections/${fc.handle}`}
              className="view-all"
              aria-label={`عرض كل منتجات ${fc.title}`}
            >
              عرض الكل
            </Link>
          </div>

          {fc.products?.length ? (
            <ProductsCarousel
              products={fc.products}
              title={fc.title}
              viewAllHref={`/collections/${fc.handle}`}
            />
          ) : (
            <div className="collection-cta">
              <Link href={`/collections/${fc.handle}`} className="btn btn-primary">
                تسوّق المجموعة
              </Link>
              {fc.error && (
                <small style={{ color: "#888", marginTop: 8 }}>
                  (تعذّر تحميل المنتجات الآن)
                </small>
              )}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
