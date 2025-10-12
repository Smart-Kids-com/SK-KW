// components/HomeSlider.jsx
"use client";
import Link from "next/link";
import styles from "./HomeSlider.module.css"; // لو عندك الملف، وإلا احذف هذا السطر

function SlideCard({ s }) {
  return (
    <Link
      href={s.link || "#"}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          boxShadow:
            "0 10px 25px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)",
          background: "#fff",
        }}
      >
        <div style={{ position: "relative", paddingBottom: "56%" }}>
          <img
            src={s.image}
            alt={s.heading || "slide"}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        {(s.heading || s.subheading || s.button_label) && (
          <div style={{ padding: 14 }}>
            {s.heading && (
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                {s.heading}
              </h3>
            )}
            {s.subheading && (
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                <span dangerouslySetInnerHTML={{ __html: s.subheading }} />
              </p>
            )}
            {s.button_label && (
              <div
                style={{
                  marginTop: 10,
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "#9422af",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {s.button_label}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomeSlider({ slides = [], title = "" }) {
  return (
    <section style={{ margin: "32px 0" }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        {title && (
          <h2
            style={{
              textAlign: "center",
              margin: "0 0 18px",
              color: "#2d3748",
              fontSize: "1.8rem",
            }}
            dangerouslySetInnerHTML={{ __html: title }}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
          className={styles?.grid || undefined}
        >
          {slides.map((s, i) => (
            <SlideCard key={i} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}