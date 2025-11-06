// components/HomepageSlideshow.js
"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, A11y } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
          renderBullet: (i, cls) => '<span class="'+cls+'">'+(i+1)+'</span>',
        }}
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i}>
            <div className="slide-content">
              <img src={s.image} alt={s.heading || `slide-${i+1}`} className="slide-image" loading="eager" fetchPriority="high" />
              <div className="slide-text">
                {s.heading && <h1 className="slide-heading">{s.heading}</h1>}
                {s.subheading && <p className="slide-subheading" dangerouslySetInnerHTML={{ __html: s.subheading }} />}
                {s.link && s.button_label && <Link href={s.link} className="btn btn--primary btn--xl">{s.button_label}</Link>}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx>{`
        .homepage-slideshow{ position:relative; width:100%; max-width:1400px; margin:0 auto 2rem; border-radius:20px; overflow:hidden; background:#fff }
        .slide-content{ display:flex; flex-direction:column; align-items:center; justify-content:center }
        .slide-image{ width:100%; height:auto; object-fit:cover; border-bottom:1px solid #eee; display:block }
        .slide-text{ padding:1.5rem; text-align:center }
        .slide-heading{ font-size:clamp(1.6rem,2.2vw,2.4rem); font-weight:800; color:#1f2937; margin:0 }
        .slide-subheading{ font-size:1.05rem; margin:.6rem 0 .9rem; color:#374151 }
      `}</style>
    </div>
  );
}
