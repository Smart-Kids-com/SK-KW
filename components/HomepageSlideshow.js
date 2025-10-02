"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Link from "next/link";

export default function HomepageSlideshow({ slides, autoplayMs = 9000 }) {
  if (!Array.isArray(slides) || slides.length === 0) return null;

  return (
    <div className="homepage-slideshow" dir="rtl">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, A11y]}
        slidesPerView={1}
        loop
        autoplay={{ delay: autoplayMs, disableOnInteraction: false }}
        navigation
        pagination={{
          clickable: true,
          renderBullet: (index, className) =>
            `<span class="${className}">${index + 1}</span>`,
        }}
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i}>
            <div className="slide-content">
              <img
                src={s.image}
                alt={s.heading || `slide-${i + 1}`}
                className="slide-image"
              />
              <div className="slide-text">
                {s.heading && <h1 className="slide-heading">{s.heading}</h1>}
                {s.subheading && (
                  <p
                    className="slide-subheading"
                    dangerouslySetInnerHTML={{ __html: s.subheading }}
                  />
                )}
                {s.link && s.button_label && (
                  <Link href={s.link} className="btn btn--primary btn--xl">
                    {s.button_label}
                  </Link>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx>{`
        .homepage-slideshow {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 2rem;
          border-radius: 20px;
          overflow: hidden;
        }
        .slide-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #fff;
        }
        .slide-image {
          width: 100%;
          object-fit: cover;
          border-bottom: 1px solid #eee;
        }
        .slide-text {
          padding: 2rem;
          text-align: center;
        }
        .slide-heading {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1f2937; /* تأكيد وضوح النص */
        }
        .slide-subheading {
          font-size: 1.1rem;
          margin: 0.75rem 0 1rem;
          color: #374151;
        }

        /* زر السلايدر (محلياً فقط داخل السلايدر) */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .btn--primary {
          background: #eeb60f;
          color: #1f2937;
          box-shadow: 0 6px 0 #c1960e;
        }
        .btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 #c1960e;
        }
        .btn--xl {
          padding: 12px 22px;
          font-size: 1.05rem;
        }

        /* ====== Pagination 1..5 على اليمين (RTL) ====== */
        :global(.homepage-slideshow .swiper-pagination) {
          position: static;
          margin-top: 0.75rem;
          display: flex;
          gap: 10px;
          justify-content: flex-end; /* يمين */
          align-items: center;
        }
        :global(.homepage-slideshow .swiper-pagination-bullet) {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 40% 35%, #cfc9ff, #bdb7ff);
          color: #ffc033;
          font-weight: 900;
          font-size: 1rem;
          box-shadow:
            inset 0 2px 8px rgba(255, 255, 255, 0.25),
            inset 0 -3px 10px rgba(0, 0, 0, 0.15),
            0 6px 18px rgba(108, 80, 181, 0.25);
          opacity: 1; /* منع الشفافية الافتراضية */
        }
        :global(.homepage-slideshow .swiper-pagination-bullet-active) {
          transform: scale(1.06);
          box-shadow:
            inset 0 3px 10px rgba(255, 255, 255, 0.3),
            inset 0 -4px 12px rgba(0, 0, 0, 0.2),
            0 10px 24px rgba(108, 80, 181, 0.38);
        }

        /* ====== أسهم التنقّل (تصغيرها وتحسينها) ====== */
        :global(.homepage-slideshow .swiper-button-next),
        :global(.homepage-slideshow .swiper-button-prev) {
          width: 36px;
          height: 36px;
          color: #4f46e5;
        }
        :global(.homepage-slideshow .swiper-button-next:after),
        :global(.homepage-slideshow .swiper-button-prev:after) {
          font-size: 18px;
          font-weight: 800;
        }

        @media (max-width: 768px) {
          .slide-text {
            padding: 1.25rem;
          }
          .slide-heading {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </div>
  );
}
