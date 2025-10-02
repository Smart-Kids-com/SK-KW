"use client";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function ProductsCarousel({ products = [], title, viewAllHref }) {
  if (!Array.isArray(products) || products.length === 0) return null;

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
          1024:{ slidesPerView: 4, spaceBetween: 18 }
        }}
      >
        {products.map((p) => (
          <SwiperSlide key={p.id}>
            <Link href={`/products/${p.handle}`} className="card">
              <div className="thumb">
                <img src={p.imageUrl} alt={p.imageAlt} />
              </div>
              <div className="info">
                <h3 className="title clamp2">{p.title}</h3>
                {p.price && <div className="price">{p.price}</div>}
                <span className="btn btn-primary">تفاصيل المنتج</span>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {viewAllHref && (
        <div className="cta-wrap">
          <Link href={viewAllHref} className="view-all">عرض الكل</Link>
        </div>
      )}

      <style jsx>{`
        .card{background:#fff;border-radius:12px;text-decoration:none;color:inherit;
          box-shadow:0 2px 8px rgba(0,0,0,.06);transition:transform .15s ease, box-shadow .2s ease;display:flex;flex-direction:column;overflow:hidden}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.12)}
        .thumb{width:100%;aspect-ratio:4/3;background:#f3f4f6;display:grid;place-items:center;overflow:hidden}
        .thumb img{width:100%;height:100%;object-fit:cover}
        .info{padding:12px 12px 16px;display:grid;gap:8px;justify-items:start}
        .title{font-size:1rem;font-weight:700;color:#1f2937;line-height:1.35}
        .clamp2{display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
        .price{color:#ef4444;font-weight:800;font-size:.95rem}
        .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:10px 18px;font-weight:800;text-decoration:none;transition:transform .15s ease, box-shadow .2s ease, background .2s ease}
        .btn-primary{background:#eeb60f;color:#1f2937;box-shadow:0 6px 0 #c1960e}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 0 #c1960e}
        .cta-wrap{display:flex;justify-content:center;margin-top:12px}
        .view-all{color:#4f46e5;text-decoration:none;font-weight:700}
      `}</style>
    </div>
  );
}
