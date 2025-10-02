// app/page.js  — Server Component (بدون "use client")
import Link from "next/link";
import HomepageSlideshow from "../components/HomepageSlideshow";

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

  const endpoint = `https://${domain}/api/2024-07/graphql.json`;
  const query = `
    query CollectionProducts($handle: String!, $first: Int!) {
      collectionByHandle(handle: $handle) {
        title
        handle
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              images(first: 1) { edges { node { url altText } } }
              priceRange {
                minVariantPrice { amount currencyCode }
              }
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
    // يضمن عدم كاش دائم أثناء التطوير
    cache: "no-store",
  });

  if (!res.ok) return { products: [], error: `HTTP ${res.status}` };

  const json = await res.json();
  const edges = json?.data?.collectionByHandle?.products?.edges || [];
  const products = edges.map(e => {
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

function ProductsGrid({ products = [] }) {
  if (!products.length) return null;
  return (
    <div className="grid">
      {products.map(p => (
        <Link key={p.id} href={`/products/${p.handle}`} className="card">
          <div className="thumb">
            {/* يمكنك لاحقًا استبدال img بـ next/image */}
            <img src={p.imageUrl} alt={p.imageAlt} />
          </div>
          <div className="info">
            <h3 className="title">{p.title}</h3>
            {p.price && <div className="price">{p.price}</div>}
            <span className="btn btn-primary">تفاصيل المنتج</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  // جهّز بيانات كل مجموعة بالتوازي
  const collectionsData = await Promise.all(
    featuredHandles.map(async (fc) => {
      const { products, error } = await fetchCollectionProducts(fc.handle, 8);
      return { ...fc, products, error };
    })
  );

  return (
    <>
      {/* 1) السلايدر الأول (5 صور) */}
      <section aria-label="Slideshow primary" style={{ margin: "0 0 24px" }}>
        <HomepageSlideshow slides={slidesPrimary} autoplayMs={AUTOPLAY_MS} />
      </section>

      {/* 2) السلايدر الثاني (5 صور) */}
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

      {/* 4) فيديو: قصص الأنبياء (كامل العرض) */}
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

      {/* 5) بانر الصورة الثانية (CTA مزدوج) */}
      <section className="banner">
        <img
          src={banners.image_banner_k6GzWz}
          alt="بانر - عروض تفاعلية"
          className="banner-img"
        />
        <div className="banner-ctas">
          <Link
            href="/collections/قصصي-الصوتية-المسموعة"
            className="btn btn-outline"
          >
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

      {/* 6) بانر الصورة الأولى (CTA واحد) */}
      <section className="banner">
        <img
          src={banners.image_banner}
          alt="بانر - عرض صوتيات"
          className="banner-img"
        />
        <div className="banner-ctas single">
          <Link
            href="/collections/قصصي-الصوتية-المسموعة"
            className="btn btn-outline"
          >
            تصفح المكتبة الصوتية
          </Link>
        </div>
      </section>

      {/* 7) أقسام المجموعات — شبكة منتجات فعلية */}
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
            <ProductsGrid products={fc.products} />
          ) : (
            <div className="collection-cta">
              <Link
                href={`/collections/${fc.handle}`}
                className="btn btn-primary"
              >
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

      <style jsx>{`
        .sec-title {
          text-align: center;
          font-size: 1.9rem;
          color: #1f2937;
          margin: 0 0 16px;
          line-height: 1.4;
        }
        .video-wrap {
          max-width: 1200px;
          margin: 0 auto 40px;
          padding: 0 16px;
        }
        .video-wrap.full {
          max-width: none;
          margin: 0 0 40px;
          padding: 0;
        }
        .video-frame {
          width: 100%;
        }
        .banner {
          max-width: 1200px;
          margin: 0 auto 40px;
          padding: 0 16px;
          text-align: center;
        }
        .banner-img {
          width: 100%;
          border-radius: 16px;
          display: block;
        }
        .banner-ctas {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .banner-ctas.single {
          justify-content: center;
        }
        .collection-block {
          max-width: 1200px;
          margin: 0 auto 48px;
          padding: 0 16px;
        }
        .collection-head {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .view-all {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 700;
        }
        .collection-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          justify-content: center;
          margin-top: 12px;
        }

        /* شبكة المنتجات */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 2px 8px rgba(0,0,0,.06);
          transition: transform .15s ease, box-shadow .2s ease;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0,0,0,.12);
        }
        .thumb {
          width: 100%;
          aspect-ratio: 4/3;
          background: #f3f4f6;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info {
          padding: 12px 12px 16px;
          display: grid;
          gap: 8px;
          justify-items: start;
        }
        .title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.4;
        }
        .price {
          color: #ef4444;
          font-weight: 800;
          font-size: 0.95rem;
        }

        /* أزرار متناسقة */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .btn-primary {
          background: #eeb60f;
          color: #1f2937;
          box-shadow: 0 6px 0 #c1960e;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 #c1960e;
        }
        .btn-outline {
          background: #fff;
          color: #7c3aed;
          border: 2px solid #7c3aed;
        }
        .btn-outline:hover {
          transform: translateY(-2px);
          background: #f8f5ff;
        }

        @media (max-width: 768px) {
          .sec-title { font-size: 1.5rem; }
        }
      `}</style>
    </>
  );
}
