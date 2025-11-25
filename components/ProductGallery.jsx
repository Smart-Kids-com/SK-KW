// @ts-nocheck
'use client';

import {useRef, useState, useEffect, useMemo, useCallback} from 'react';
import Image from 'next/image';
import s from '../styles/product-gallery.module.css';

// تطبيع صيغ صور Shopify المختلفة
function normalize(img, i) {
  const src =
    img?.url ||
    img?.src ||
    img?.originalSrc ||
    img?.image?.url ||
    img?.node?.url ||
    img?.node?.src ||
    '';
  const alt =
    img?.altText || img?.alt || img?.image?.altText || img?.node?.altText || '';
  const id = img?.id || img?.image?.id || img?.node?.id || String(i);
  return { id, src, alt: alt || 'Product image' };
}

export default function ProductGallery({ images = [], initialIndex = 0 }) {
  const list = useMemo(() => images.map(normalize).filter(x => !!x.src), [images]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const safe = Math.min(Math.max(initialIndex, 0), Math.max(list.length - 1, 0));
    setIndex(safe);
  }, [initialIndex, list.length]);

  const stageRef = useRef(null);
  const thumbsRef = useRef(null);
  const touch = useRef({ x: 0, y: 0 });

  const go = useCallback(
    (dir) => {
      if (!list.length) return;
      setIndex((i) => {
        const n = i + dir;
        if (n < 0) return list.length - 1;
        if (n > list.length - 1) return 0;
        return n;
      });
    },
    [list.length]
  );

  // أسهم الكيبورد
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // سوايب للموبايل
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
  };

  // سكرول الثَمبز بأمان
  const scrollThumbs = (delta) => {
    const el = thumbsRef.current;
    if (!el) return;
    if ('scrollBy' in el) el.scrollBy({ left: delta, behavior: 'smooth' });
    else el.scrollLeft += delta;
  };

  const current = list[index];

  return (
    <section className={s.gallery} dir="rtl" aria-label="معرض صور المنتج">
      <div
        className={s.stage}
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <Image
            key={current.id}
            src={current.src}
            alt={current.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className={s.stageImg} /* cover داخل مربع 1:1 */
          />
        ) : (
          <div className={s.stagePlaceholder}>No image</div>
        )}

        <button
          type="button"
          className={`${s.nav} ${s.prev}`}
          onClick={() => go(-1)}
          aria-label="السابق"
          dangerouslySetInnerHTML={{ __html: '&lsaquo;' }}
        />
        <button
          type="button"
          className={`${s.nav} ${s.next}`}
          onClick={() => go(1)}
          aria-label="التالي"
          dangerouslySetInnerHTML={{ __html: '&rsaquo;' }}
        />

        {current && (
          <a
            className={s.zoom}
            href={current.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تكبير الصورة في تبويب جديد"
            title="تكبير"
          >
            ⤢
          </a>
        )}
      </div>

      {/* شريط الصور المصغّرة */}
      <div className={s.thumbsWrap} role="listbox" aria-label="صور مصغّرة">
        <button
          type="button"
          className={`${s.scroll} ${s.scrollPrev}`}
          onClick={() => scrollThumbs(-160)}
          aria-label="تحريك الثَمبز لليسار"
          dangerouslySetInnerHTML={{ __html: '&lsaquo;' }}
        />

        <div ref={thumbsRef} id="thumbs-scroll" className={s.thumbs} dir="rtl">
          {list.map((img, i) => (
            <button
              key={img.id ?? i}
              type="button"
              className={`${s.thumb} ${i === index ? s.active : ''}`}
              onClick={() => setIndex(i)}
              aria-selected={i === index}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="92px"
                className={s.thumbImg}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`${s.scroll} ${s.scrollNext}`}
          onClick={() => scrollThumbs(160)}
          aria-label="تحريك الثَمبز لليمين"
          dangerouslySetInnerHTML={{ __html: '&rsaquo;' }}
        />
      </div>
    </section>
  );
}
