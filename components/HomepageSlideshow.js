"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, A11y } from "swiper/modules";
import Link from "next/link";
// مفيش أي import لـ "swiper/css" هنا
/**
 * Simple hero slideshow for the homepage.
 * Props:
 *  - slides: [{ image, heading, subheading, button_label, link }]
 *  - autoplayMs: number (default 9000)
 */
export default function HomepageSlideshow({ slides = [], autoplayMs = 9000 }) {
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
            <span class="${className}">${index + 1}</span>,
        }}
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i}>
            <div className="slide-content">
              <img
                src={s.image}
                alt={s.heading || `slide-${i + 1}`}
                className="slide-image"
                loading="eager"
                fetchPriority="high"
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
          max-width: 1400px;
          margin: 0 auto 2rem;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
        }
        .slide-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .slide-image {
          width: 100%;
          object-fit: cover;
          border-bottom: 1px solid #eee;
        }
        .slide-text {
          padding: 1.5rem;
          text-align: center;
        }
        .slide-heading {
          font-size: clamp(1.6rem, 2.2vw, 2.4rem);
          font-weight: 800;
          color: #1f2937;
          margin: 0;
        }
        .slide-subheading {
          font-size: 1.05rem;
          margin: 0.6rem 0 0.9rem;
          color: #374151;
        }

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
          padding: 12px 22px;
          font-size: 1.05rem;
        }
        .btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 #c1960e;
        }

        :global(.homepage-slideshow .swiper-pagination) {
          position: static;
          margin-top: 0.75rem;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
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
          opacity: 1;
        }
        :global(.homepage-slideshow .swiper-pagination-bullet-active) {
          transform: scale(1.06);
          box-shadow:
            inset 0 3px 10px rgba(255, 255, 255, 0.3),
            inset 0 -4px 12px rgba(0, 0, 0, 0.2),
            0 10px 24px rgba(108, 80, 181, 0.38);
        }

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
      `}</style>
 </div>
);
}