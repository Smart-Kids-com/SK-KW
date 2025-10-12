"use client";
import HomeSlider from "@/components/HomeSlider";
import { AUTOPLAY_MS, slidesPrimary, slidesSecondary } from "@/lib/homepageData";
import Link from "next/link";
import { useMemo } from "react";

/* ===================== Utils ===================== */
function resolveMedia(url) {
  if (!url) return "";
  if (url.startsWith("shopify://shop_images/")) {
    const file = url.replace("shopify://shop_images/", "");
    return `/cdn/shop/files/${file}`;
  }
  if (url.startsWith("shopify://files/")) {
    const file = url.replace("shopify://files/", "");
    return `/cdn/shop/files/${file}`;
  }
  return url;
}
function resolveLink(link) {
  if (!link) return "#";
  if (link.startsWith("shopify://collections/")) {
    const h = link.replace("shopify://collections/", "");
    return `/collections/${encodeURIComponent(h)}`;
  }
  if (link.startsWith("shopify://products/")) {
    const h = link.replace("shopify://products/", "");
    return `/products/${encodeURIComponent(h)}`;
  }
  return link.startsWith("/") ? link : `/${link}`;
}
function stripHtml(html) {
  return (html || "").replace(/<[^>]*>?/gm, "");
}
function safeHrefFromSlide(s = {}) {
  if (s.link) return resolveLink(s.link);
  const m = (s.heading || "").match(/href="([^"]+)"/i);
  return m ? resolveLink(m[1]) : null;
}

/* ===================== Data (unchanged) ===================== */
const INDEX_DATA = {
  sections: { /* ——— نفس البيانات كما أرسلتها ——— */ },
  order: [ /* ——— نفس الترتيب كما أرسلت ——— */ ],
};

/* ===================== Reusable Components ===================== */
function SectionWrap({ children }) {
  return (
    <section className="section">
      <div className="container">{children}</div>
    </section>
  );
}

function SlideCard({ s }) {
  const href = safeHrefFromSlide(s);
  const title = stripHtml(s.heading || "") || "slide";
  const CardInner = (
    <>
      <div className="mediaRatio">
        <img
          src={resolveMedia(s.image)}
          alt={title}
          loading="lazy"
          decoding="async"
          className="media"
        />
      </div>
      {(s.heading || s.subheading || s.button_label) && (
        <div className="cardBody">
          {s.heading && <h3 className="cardTitle">{stripHtml(s.heading)}</h3>}
          {s.subheading && <p className="cardSub">{stripHtml(s.subheading)}</p>}
          {s.button_label && <span className="btnPrimary asSpan">{s.button_label}</span>}
        </div>
      )}
    </>
  );

  return href ? (
    <Link href={href} className="card" aria-label={title}>
      {CardInner}
    </Link>
  ) : (
    <div className="card" role="group" aria-label={title}>
      {CardInner}
    </div>
  );
}

function Slideshow({ section }) {
  return (
    <SectionWrap>
      <div className="grid">
        {section.block_order?.map((id) => {
          const block = section.blocks[id];
          return block ? <SlideCard key={id} s={block.settings} /> : null;
        })}
      </div>
    </SectionWrap>
  );
}

function VideoSection({ section }) {
  const s = section.settings || {};
  return (
    <SectionWrap>
      <div className="videoWrap">
        {s.heading ? <h2 className="videoTitle">{stripHtml(s.heading)}</h2> : null}
        {s.cover_image && (
          <div className="mediaRatio">
            <img
              src={resolveMedia(s.cover_image)}
              alt="فيديو تعليمي"
              loading="lazy"
              decoding="async"
              className="media"
            />
          </div>
        )}
        {s.description ? <p className="muted">{stripHtml(s.description)}</p> : null}
      </div>
    </SectionWrap>
  );
}

function ImageBanner({ section }) {
  const s = section.settings || {};
  const hasTwoImages = s.image && s.image_2;

  const content = useMemo(() => {
    return (section.block_order || []).map((id) => {
      const block = section.blocks[id];
      if (!block) return null;

      if (block.type === "heading" && block.settings.heading) {
        return (
          <h2 key={id} className="bannerTitle">
            {stripHtml(block.settings.heading)}
          </h2>
        );
      }
      if (block.type === "text" && block.settings.text) {
        return (
          <p key={id} className="bannerText">
            {stripHtml(block.settings.text)}
          </p>
        );
      }
      if (block.type === "buttons") {
        return (
          <div key={id} className="btnRow">
            {block.settings.button_label_1 && (
              <Link href={resolveLink(block.settings.button_link_1) || "#"} className="btnPrimary">
                {block.settings.button_label_1}
              </Link>
            )}
            {block.settings.button_label_2 && (
              <Link href={resolveLink(block.settings.button_link_2) || "#"} className="btnSecondary">
                {block.settings.button_label_2}
              </Link>
            )}
          </div>
        );
      }
      return null;
    });
  }, [section]);

  if (hasTwoImages) {
    return (
      <SectionWrap>
        <div className="bannerTwoCol">
          <div className="onlyDesktop bannerHero">
            <img
              src={resolveMedia(s.image)}
              alt="بانر"
              loading="lazy"
              decoding="async"
              className="heroImg"
            />
            <div className="bannerOverlay">{content}</div>
          </div>

          <div className="onlyMobile">
            <div className="mediaRadius mb16">
              <img
                src={resolveMedia(s.image)}
                alt="بانر 1"
                loading="lazy"
                decoding="async"
                className="media"
              />
            </div>
            <div className="bannerBox">{content}</div>
            <div className="mediaRadius">
              <img
                src={resolveMedia(s.image_2)}
                alt="بانر 2"
                loading="lazy"
                decoding="async"
                className="media"
              />
            </div>
          </div>
        </div>
      </SectionWrap>
    );
  }

  return (
    <SectionWrap>
      <div className="onlyDesktop bannerHero">
        {s.image && (
          <img
            src={resolveMedia(s.image)}
            alt="بانر"
            loading="lazy"
            decoding="async"
            className="heroImg"
          />
        )}
        <div className="bannerOverlay">{content}</div>
      </div>

      <div className="onlyMobile">
        {s.image && (
          <div className="mediaRadius mb16">
            <img
              src={resolveMedia(s.image)}
              alt="بانر"
              loading="lazy"
              decoding="async"
              className="media"
            />
          </div>
        )}
        <div className="bannerBox">{content}</div>
      </div>
    </SectionWrap>
  );
}

function FeaturedCollection({ section }) {
  const s = section.settings || {};
  return (
    <SectionWrap>
      <div className="feat">
        {s.title ? <h2 className="featTitle">{stripHtml(s.title)}</h2> : null}
        {s.description ? <div className="featDesc">{stripHtml(s.description)}</div> : null}
        <p className="muted">استكشف مجموعة {section.name || "منتجاتنا المميزة"}</p>
        <Link
          href={`/collections/${s.collection || "all"}`}
          className="btnPrimary large"
          aria-label={`عرض مجموعة ${section.name || ""}`}
        >
          عرض المجموعة
        </Link>
      </div>
    </SectionWrap>
  );
}

/* ===================== Page ===================== */
export default function HomePage() {
  return (
    <>
      <style jsx>{`
        :root{
          --bg:#370e3e; --fg:#ffffff; --ink:#2d3748; --muted:#718096;
          --brand:#9422af; --brand2:#710d43; --radius:12px; --shadow:0 12px 30px rgba(0,0,0,.18);
          --wrap:1600px; --gx:28px; --gy:28px; --section:4rem;
        }
        @media (max-width: 768px){
          :root{ --gx:16px; --gy:16px; --section:2rem; }
        }
        .container{max-width:var(--wrap);margin:auto;padding:0 var(--gx)}
        .section{margin-bottom:var(--section)}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--gy)}
        .mediaRatio{position:relative;padding-bottom:56%}
        .media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:var(--radius)}
        .card{display:block;border:1px solid rgba(148,34,175,.1);border-radius:12px;overflow:hidden;background:#fff;color:#111;box-shadow:var(--shadow);transition:transform .25s ease, box-shadow .25s ease;text-decoration:none}
        .card:hover{transform:translateY(-3px)}
        .cardBody{padding:14px}
        .cardTitle{margin:0;font-size:1.1rem;font-weight:800}
        .cardSub{margin:.5rem 0 0;color:var(--muted)}
        .btnPrimary{display:inline-block;padding:.7rem 1.2rem;background:var(--brand);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;border:2px solid var(--brand);box-shadow:0 6px 16px rgba(148,34,175,.25)}
        .btnPrimary.asSpan{cursor:default}
        .btnSecondary{display:inline-block;padding:.7rem 1.2rem;background:var(--brand2);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;border:2px solid var(--brand2)}
        .btnRow{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .large{padding:.9rem 2rem;border-radius:12px}
        .videoWrap{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:var(--radius);padding:20px;text-align:center}
        .videoTitle{margin:0 0 12px;color:#fff;font-size:2rem}
        .muted{color:var(--muted)}
        .bannerTwoCol{}
        .bannerHero{position:relative;min-height:400px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#9422af 0%,#7c1d8a 100%)}
        .heroImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9}
        .bannerOverlay{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:#fff;padding:2rem}
        .bannerTitle{margin:0 0 10px;font-size:2.2rem;font-weight:800}
        .bannerText{margin:0 0 18px;font-size:1.1rem;opacity:.95}
        .bannerBox{text-align:center;padding:20px;background:#f8f9fa;border-radius:16px;margin:0 0 16px}
        .mediaRadius{border-radius:16px;overflow:hidden}
        .mb16{margin-bottom:16px}
        .feat{text-align:center;background:#f8f9fa;border-radius:16px;padding:48px 24px}
        .featTitle{margin:0 0 10px;font-size:2rem;color:var(--ink)}
        .featDesc{margin:0 0 10px;color:var(--ink)}
        .onlyDesktop{display:block}
        .onlyMobile{display:none}
        @media (max-width: 768px){
          .onlyDesktop{display:none}
          .onlyMobile{display:block}
        }
        main{direction:rtl;background:var(--bg);color:var(--fg);min-height:100vh;font-family:'Amiri',serif;line-height:1.6}
      `}</style>

      <main>
        {INDEX_DATA.order.map((id) => {
          const section = INDEX_DATA.sections[id];
          if (!section) return null;

          if (section.type === "slideshow") return <Slideshow key={id} section={section} />;
          if (section.type === "video") return <VideoSection key={id} section={section} />;
          if (section.type === "image-banner") return <ImageBanner key={id} section={section} />;
          if (section.type === "featured-collection") return <FeaturedCollection key={id} section={section} />;
          return null;
        })}
      </main>
    </>
  );
}
