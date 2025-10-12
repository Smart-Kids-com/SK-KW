"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import cls from "./HomeSlider.module.css";

/**
 * props:
 * items: [
 *   {
 *     image,
 *     image_mobile?,      // اختياري
 *     image_desktop?,     // اختياري
 *     heading?,
 *     subheading?(HTML),
 *     button_label?,
 *     link?
 *   }
 * ]
 * autoplayMs: رقم (ms) اختياري
 */
export default function HomeSlider({ items = [], autoplayMs = 9000, className = "" }) {
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  // AutoPlay
  useEffect(() => {
    const el = trackRef.current;
    if (!el || items.length <= 1) return;

    const T = Math.max(3000, autoplayMs || 9000);

    const go = () => {
      setIdx(prev => {
        const next = (prev + 1) % items.length;
        el.scrollTo({ left: slideLeft(el, next), behavior: "smooth" });
        return next;
      });
    };

    timerRef.current = setInterval(go, T);
    const stop = () => clearInterval(timerRef.current);

    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("mouseenter", stop);
    el.addEventListener("mouseleave", () => (timerRef.current = setInterval(go, T)));

    return () => {
      clearInterval(timerRef.current);
      el && el.removeEventListener("touchstart", stop);
    };
  }, [items.length, autoplayMs]);

  // Sync index on scroll (mobile swipe)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const i = Math.round(el.scrollLeft / (el.scrollWidth / items.length));
        setIdx(Math.min(Math.max(i, 0), items.length - 1));
      }, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    setIdx(i);
    el.scrollTo({ left: slideLeft(el, i), behavior: "smooth" });
  };

  const next = () => goTo(Math.min(idx + 1, items.length - 1));
  const prev = () => goTo(Math.max(idx - 1, 0));

  return (
    <div className={`${cls.slider} ${className}`}>
      <button className={`${cls.arrow} ${cls.left}`} onClick={prev} aria-label="السابق">
        ‹
      </button>

      <div className={cls.track} ref={trackRef}>
        {items.map((s, i) => (
          <div className={cls.slide} key={i}>
            <Link className={cls.card} href={s.link || "#"} aria-label={s.heading || `slide-${i}`}>
              <div className={cls.ratio}>
                <picture>
                  {s.image_mobile && <source media="(max-width: 991px)" srcSet={s.image_mobile} />}
                  {s.image_desktop && <source media="(min-width: 992px)" srcSet={s.image_desktop} />}
                  <img
                    className={cls.media}
                    src={s.image}
                    alt={s.heading || `slide-${i}`}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>

              {(s.heading || s.subheading || s.button_label) && (
                <div className={cls.body}>
                  {s.heading && <h3 className={cls.ttl}>{s.heading}</h3>}
                  {s.subheading && (
                    <p className={cls.sub} dangerouslySetInnerHTML={{ __html: s.subheading }} />
                  )}
                  {s.button_label && <span className={cls.btn}>{s.button_label}</span>}
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>

      <button className={`${cls.arrow} ${cls.right}`} onClick={next} aria-label="التالي">
        ›
      </button>

      {items.length > 1 && (
        <div className={cls.dotRow}>
          {items.map((_, i) => (
            <span
              key={i}
              className={`${cls.dot} ${i === idx ? cls.active : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// مساعد لحساب المسافة للتمرير (موبايل فقط)
function slideLeft(el, i) {
  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 992px)").matches;

  if (isDesktop) return 0;

  const gap = 12;
  const slideW = el.clientWidth * 0.85;
  return i * (slideW + gap);
}
