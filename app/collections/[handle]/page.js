// app/collections/[handle]/page.js
import Link from "next/link";
import ProductCard from "../../../components/ProductCard";

async function fetchCollectionByHandle(handle) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
  if (!domain || !token || !handle) return null;

  const endpoint = `https://${domain}/api/2024-07/graphql.json`;
  const query = `
    query CollectionByHandle($handle: String!, $first: Int!) {
      collectionByHandle(handle: $handle) {
        title
        handle
        description
        descriptionHtml
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              images(first: 6) { edges { node { url altText } } }
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
    body: JSON.stringify({ query, variables: { handle, first: 24 } }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const json = await res.json();
  const c = json?.data?.collectionByHandle;
  if (!c) return null;

  const products =
    c.products?.edges?.map((e) => {
      const n = e.node;
      const img = n.images?.edges?.[0]?.node || {};
      const price = n.priceRange?.minVariantPrice;
      return {
        ...n,
        imageUrl: img.url || "",
        imageAlt: img.altText || n.title,
        priceText: price ? `${Number(price.amount).toFixed(3)} ${price.currencyCode}` : "",
      };
    }) || [];

  return {
    title: c.title,
    handle: c.handle,
    description: c.description,
    descriptionHtml: c.descriptionHtml,
    products,
  };
}

export default async function CollectionPage({ params }) {
  const decodedHandle = decodeURIComponent(params?.handle || "");
  const collection = await fetchCollectionByHandle(decodedHandle);

  if (!collection) {
    return (
      <div
        className="container"
        dir="rtl"
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>😕</div>
        <h1 style={{ fontSize: "2rem", color: "var(--color-primary)", marginBottom: "1rem" }}>
          هذه المجموعة غير موجودة
        </h1>
        <p
          style={{
            color: "var(--color-gray)",
            fontSize: "1.1rem",
            marginBottom: "2rem",
            maxWidth: "500px",
            lineHeight: "1.6",
          }}
        >
          عذراً، المجموعة التي تبحث عنها غير متوفرة حالياً. يمكنك استكشاف مجموعاتنا الأخرى أو العودة للصفحة الرئيسية.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
            🏠 العودة للرئيسية
          </Link>
          <Link href="/search" className="btn btn-outline" style={{ textDecoration: "none" }}>
            🔍 البحث عن المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section
        dir="rtl"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
          color: "var(--color-white)",
          padding: "3rem 2rem",
          marginBottom: "3rem",
        }}
      >
        <div className="container" style={{ textAlign: "center" }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: "2rem", fontSize: "0.9rem", opacity: 0.9 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              الرئيسية
            </Link>
            <span style={{ margin: "0 0.5rem" }}>←</span>
            <span>المجموعات</span>
            <span style={{ margin: "0 0.5rem" }}>←</span>
            <span style={{ fontWeight: 700 }}>{collection.title}</span>
          </nav>

          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 800,
              marginBottom: "1rem",
              textShadow: "2px 2px 4px rgba(0,0,0,0.25)",
            }}
          >
            🎯 {collection.title}
          </h1>

          {Boolean(collection.descriptionHtml || collection.description) && (
            <div
              style={{
                fontSize: "1.15rem",
                marginBottom: "2rem",
                opacity: 0.95,
                maxWidth: "700px",
                marginInline: "auto",
                lineHeight: 1.7,
              }}
              dangerouslySetInnerHTML={{
                __html: collection.descriptionHtml || collection.description,
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "0.7rem 1.2rem",
                borderRadius: 22,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.35)",
                fontWeight: 700,
              }}
            >
              📦 {collection.products.length} منتج
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "0.7rem 1.2rem",
                borderRadius: 22,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.35)",
                fontWeight: 700,
              }}
            >
              🚚 توصيل مجاني
            </div>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="container" dir="rtl" style={{ paddingBottom: "3rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            padding: "1rem",
            background: "var(--color-white)",
            borderRadius: "12px",
            boxShadow: "0 6px 18px rgba(0,0,0,.06)",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontWeight: 700, color: "var(--color-primary)", fontSize: "1rem" }}>
              ترتيب حسب:
            </span>
            <select
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: 10,
                border: "2px solid #e5e7eb",
                fontSize: ".95rem",
                minWidth: 180,
                cursor: "pointer",
              }}
              defaultValue="newest"
            >
              <option value="newest">الأحدث</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="bestseller">الأكثر مبيعاً</option>
            </select>
          </div>

          <div style={{ color: "#6b7280", fontSize: ".95rem" }}>
            عرض {collection.products.length} من {collection.products.length} منتج
          </div>
        </div>

        {/* Products */}
        {collection.products.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {collection.products.map((product, i) => (
              <div key={product.id} className="fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                <ProductCard product={product} locale="ar" />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              background: "var(--color-white)",
              borderRadius: "12px",
              boxShadow: "0 6px 18px rgba(0,0,0,.06)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📦</div>
            <h3 style={{ fontSize: "1.35rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>
              لا توجد منتجات في هذه المجموعة حالياً
            </h3>
            <p style={{ color: "#6b7280", maxWidth: 420, margin: "0 auto 1.25rem" }}>
              نعمل على إضافة منتجات جديدة قريباً. تابعونا للحصول على آخر التحديثات!
            </p>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
              استكشف المجموعات الأخرى
            </Link>
          </div>
        )}

        {/* Load more (placeholder) */}
        {collection.products.length >= 24 && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button className="btn btn-outline" style={{ padding: "0.9rem 1.8rem", fontSize: "1.05rem" }}>
              عرض المزيد من المنتجات
            </button>
          </div>
        )}
      </section>
    </>
  );
}
