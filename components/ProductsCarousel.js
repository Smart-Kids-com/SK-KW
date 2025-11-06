"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function ProductsCarousel({ products = [], title, viewAllHref }) {
  if (!Array.isArray(products) || products.length === 0) return null;

  const pathname = usePathname();
  const base = pathname?.startsWith("/ar") ? "/ar" : "";

  return (
    <div className="products-carousel" dir="rtl">
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
          const href = `${base}/products/${encodeURIComponent(p.handle)}`;
          return (
            <SwiperSlide key={p.id}>
              <Link href={href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="thumb" style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#f3f4f6" }}>
                  <img src={p.imageUrl || "/placeholder-product.jpg"} alt={p.imageAlt || p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div className="info">
                  <h3 className="title clamp2">{p.title}</h3>
                  {p.price && <div className="price">{p.price}</div>}
                  <span className="btn btn-primary">تفاصيل المنتج</span>
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {viewAllHref && (
        <div className="cta-wrap">
          <Link href={viewAllHref} className="view-all">عرض الكل</Link>
        </div>
      )}

      <style jsx>{`
        .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(196, 34, 126, 0.06); transition:.15s; display:flex; flex-direction:column; overflow:hidden }
        .card:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(143, 19, 112, 0.12) }
        .info { padding:12px 12px 16px; display:grid; gap:8px; justify-items:start }
        .title { font-size:1rem; font-weight:700; color:#1f2937; line-height:1.35 }
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
