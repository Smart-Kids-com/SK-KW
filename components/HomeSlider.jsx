"use client";
import Link from "next/link";
import styles from "./HomeSlider.module.css";

/**
 * Simple responsive grid of promotional cards (secondary slider look).
 * Props: slides = [{ image, heading, subheading, button_label, link }]
 */
function SlideCard({ s }) {
  return (
    <Link href={s.link || "#"} style={{ textDecoration: "none", color: "inherit" }}>
      <div className={styles.card}>
        <div className={styles.ratio}>
          <img src={s.image} alt={s.heading || "slide"} className={styles.media} />
        </div>

        {(s.heading || s.subheading || s.button_label) && (
          <div className={styles.body}>
            {s.heading && <h3 className={styles.ttl}>{s.heading}</h3>}
            {s.subheading && (
              <p className={styles.sub}>
                <span dangerouslySetInnerHTML={{ __html: s.subheading }} />
              </p>
            )}
            {s.button_label && <span className={styles.btn}>{s.button_label}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomeSlider({ slides = [], title = "" }) {
  if (!slides?.length) return null;
  return (
    <section style={{ margin: "32px 0" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px" }}>
        {title && (
          <h2
            style={{
              textAlign: "center",
              margin: "0 0 18px",
              color: "#2d3748",
              fontSize: "1.8rem",
              fontWeight: 800
            }}
            dangerouslySetInnerHTML={{ __html: title }}
          />
        )}

        <div
          className={styles.track}
          style={{
            display: "flex",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {slides.map((s, i) => (
            <div key={i} className={styles.slide}>
              <SlideCard s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
