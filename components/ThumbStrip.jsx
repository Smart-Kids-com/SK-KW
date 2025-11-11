'use client';
import Image from 'next/image';
import s from './product-gallery.module.css';

export default function ThumbStrip({ images = [], current = 0, onSelect }) {
  return (
    <div className={s.thumbsWrap} role="listbox" dir="rtl">
      <div className={s.thumbs}>
        {images.map((img, i) => (
          <button
            key={img.id || i}
            className={`${s.thumb} ${i === current ? s.active : ''}`}
            onClick={() => onSelect?.(i)}
            type="button"
            aria-selected={i === current}
          >
            <Image src={img.src} alt={img.alt || ''} fill sizes="92px" className={s.thumbImg} />
          </button>
        ))}
      </div>
    </div>
  );
}
