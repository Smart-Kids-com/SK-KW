"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import AddToCartButton from "@/components/AddToCartButton";

// ملاحظة: CSS الخاص بـ Swiper مستورد بالفعل في app/layout.js
// import "swiper/css";
// import "swiper/css/navigation";
// import "swiper/css/pagination";

function formatMoney(amount, currency = "KWD") {
  const num = Number(amount || 0);
  try {
    return new Intl.NumberFormat("ar-KW", { style: "currency", currency }).format(num);
  } catch {
    const frac = currency === "KWD" ? 3 : 2;
    return `${num.toFixed(frac)} ${currency}`;
  }
}

export default function ProductsCarousel({ products = [], title, viewAllHref }) {
  if (!Array.isArray(products) || products.length === 0) return null;

  const pathname = usePathname();
  const base = pathname?.startsWith("/ar") ? "/ar" : "";

  return (
    <div className="products-carousel" dir="rtl">
      {title ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 10px" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>{title}</h2>
          {viewAllHref ? (
            <Link href={viewAllHref} className="view-all">
              عرض الكل
            </Link>
          ) : null}
        </div>
      ) : null}

      <Swiper
        modules={[Navigation, Pagination, A11y]}
        slidesPerView={2}
        spaceBetween={12}
        navigation
        pagination={{ clickable: true }}
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 14 },
          768: { slidesPerView: 3, spaceBetween: 16 },
          1024: { slidesPerView: 4, spaceBetween: 18 },
        }}
      >
        {products.map((p) => {
          const handle = p?.handle || "";
          const href = `${base}/products/${encodeURIComponent(handle)}`;

          // صور شوبيفاي
          const imgSrc =
            p?.featuredImage?.url ||
            (Array.isArray(p?.images) && p.images[0]?.url) ||
            p?.imageUrl || // fallback لو عندك mapping قديم
            "/placeholder-product.jpg";
          const imgAlt =
            p?.featuredImage?.altText ||
            p?.imageAlt ||
            p?.title ||
            "product";

          // سعر من priceRange
          const minAmount = p?.priceRange?.minVariantPrice?.amount;
          const currency = p?.priceRange?.minVariantPrice?.currencyCode || "KWD";
          const priceText = minAmount != null ? formatMoney(minAmount, currency) : (p?.price || "");

          // أول Variant لزر الإضافة (لو متاح)
          const variantId =
            Array.isArray(p?.variants) && p.variants.length > 0
              ? p.variants[0]?.id
              : null;

          return (
            <SwiperSlide key={p.id || handle}>
              <div className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <Link href={href} className="thumbLink" aria-label={p?.title || "عرض المنتج"}>
                  <div
                    className="thumb"
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      background: "#f3f4f6",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={imgAlt}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                </Link>

                <div className="info">
                  <Link href={href} className="titleLink" style={{ textDecoration: "none" }}>
                    <h3 className="title clamp2">{p?.title || ""}</h3>
                  </Link>

                  {priceText ? <div className="price">{priceText}</div> : null}

                  <div style={{ width: "100%" }}>
                    {variantId ? (
                      <AddToCartButton
                        variantId={variantId}
                        style={{
                          width: "100%",
                          padding: ".85rem 1rem",
                          borderRadius: 14,
                          border: "2px solid #eeb60f",
                          background: "transparent",
                          color: "#1f2937",
                          fontWeight: 800,
                          boxShadow: "0 6px 0 #c1960e",
                        }}
                      >
                        أضف إلى عربة التسوق
                      </AddToCartButton>
                    ) : (
                      <Link
                        href={href}
                        className="btn btn-primary"
                        style={{ display: "inline-block", width: "100%", textAlign: "center" }}
                      >
                        تفاصيل المنتج
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {viewAllHref && !title && (
        <div className="cta-wrap">
          <Link href={viewAllHref} className="view-all">
            عرض الكل
          </Link>
        </div>
      )}

      <style jsx>{`
        .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(196, 34, 126, 0.06); transition:.15s; display:flex; flex-direction:column; overflow:hidden }
        .card:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(143, 19, 112, 0.12) }
        .info { padding:12px 12px 16px; display:grid; gap:8px; justify-items:start }
        .title { font-size:1rem; font-weight:700; color:#1f2937; line-height:1.35; margin:0 }
        .titleLink { color:#1f2937 }
        .clamp2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .price { color:#ef4444; font-weight:800; font-size:.95rem }
        .btn { display:inline-flex; align-items:center; justify-content:center; border-radius:999px; padding:10px 18px; font-weight:800; text-decoration:none; transition:.15s }
        .btn-primary { background:#eeb60f; color:#1f2937; box-shadow:0 6px 0 #c1960e }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 0 #c1960e }
        .cta-wrap { display:flex; justify-content:center; margin-top:12px }
        .view-all { color:#d11783ff; text-decoration:none; font-weight:700 }
      `}</style>
    </div>
  );
}