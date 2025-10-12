// app/page.js
import Link from "next/link";

/* ===== Utils ===== */
function resolveLink(link = "") {
  if (!link) return null;
  // shopify://products/<handle>
  if (/^shopify:\/\/products\//i.test(link)) {
    const handle = decodeURIComponent(link.split("/").pop() || "").trim();
    return `/products/${handle}`;
  }
  // shopify://collections/<handle>
  if (/^shopify:\/\/collections\//i.test(link)) {
    const handle = decodeURIComponent(link.split("/").pop() || "").trim();
    return `/collections/${handle}`;
  }
  return link; // http(s) أو مسار نسبي
}

function resolveMedia(src = "") {
  // اتركه كما هو (لو عندك proxy أو محوّل للروابط الخاصة بـ shopify://)
  return src;
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>?/gm, "");
}

function extractHrefFromHTML(html = "") {
  const m = (html || "").match(/href="([^"]+)"/i);
  return m ? m[1] : null;
}

function safeHrefFromSlide(s = {}) {
  if (s.link) return resolveLink(s.link);
  const fromHeading = extractHrefFromHTML(s.heading || "");
  if (fromHeading) return resolveLink(fromHeading);
  return null;
}

/* ===== Slide Card ===== */
function SlideCard({ s }) {
  const href = safeHrefFromSlide(s);

  const content = (
    <>
      <div style={{ position: "relative", paddingBottom: "56%" }}>
        <img
          src={resolveMedia(s.image)}
          alt={stripHtml(s.heading || "") || "slide"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "var(--media-radius)",
          }}
        />
      </div>

      {(s.heading || s.subheading || s.button_label) && (
        <div style={{ padding: 16 }}>
          {s.heading && (
            <div
              style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}
              // إزالة أي روابط داخل العنوان لتفادي nested <a>
              dangerouslySetInnerHTML={{
                __html: (s.heading || "").replace(/<\/?a[^>]*>/g, ""),
              }}
            />
          )}

          {s.subheading && (
            <p
              style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: s.subheading }}
            />
          )}

          {s.button_label && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "#9422af",
                color: "#fff",
                borderRadius: 10,
                width: "fit-content",
                fontWeight: 700,
              }}
            >
              {s.button_label}
            </div>
          )}
        </div>
      )}
    </>
  );

  const cardStyle = {
    textDecoration: "none",
    color: "inherit",
    display: "block",
    borderRadius: "var(--card-corner-radius)",
    overflow: "hidden",
    background: "var(--color-foreground)",
    color: "var(--color-background)",
    boxShadow:
      "var(--buttons-shadow-horizontal-offset) var(--buttons-shadow-vertical-offset) var(--buttons-shadow-blur) rgba(0,0,0,.25)",
    border: "1px solid rgba(148, 34, 175, 0.1)",
    transition: "transform 0.2s ease",
  };

  return href ? (
    <Link href={href} style={cardStyle}>
      {content}
    </Link>
  ) : (
    <div style={cardStyle}>{content}</div>
  );
}

/* ===== بيانات الصفحة ===== */
/* مبدئيًا فارغة؛ الكود آمن لو الأقسام غير موجودة */
const INDEX_DATA = {
  sections: {
    // مثال واحد حتى تعمل الصفحة لوحدها بدون أخطاء
    featured_collection_A9VzML: {
      type: "featured-collection",
      name: "عروض القصص التفاعلية",
      settings: {
        title: "عروض القصص التفاعلية",
        collection: "عروض-القصص-التفاعلية",
      },
    },
  },
  order: [
    // أضف المعرفات حسب حاجتك، المعرف غير الموجود سيتجاهله الكود تلقائيًا
    "featured_collection_A9VzML",
  ],
};

/* ===== الصفحة الرئيسية ===== */
export default function HomePage() {
  return (
    <>
      <style jsx>{`
        :root {
          --color-background: #370e3e;
          --color-foreground: #ffffff;
          --color-button: #9422af;
          --color-button-text: #ffffff;
          --color-secondary-button: #710d43;
          --color-badge-background: #e9ee30;
          --color-badge-foreground: #3d0846;

          --font-body-family: 'Amiri', serif;
          --font-heading-family: 'Assistant', sans-serif;
          --font-body-scale: 1.2;
          --font-heading-scale: 1.1;

          --page-width: 100%;
          --spacing-sections: 2rem;
          --spacing-grid-horizontal: 1rem;
          --spacing-grid-vertical: 1rem;

          --buttons-radius: 4px;
          --media-radius: 10px;
          --card-corner-radius: 4px;

          --buttons-shadow-opacity: 0.45;
          --buttons-shadow-horizontal-offset: 8px;
          --buttons-shadow-vertical-offset: 8px;
          --buttons-shadow-blur: 15px;
          --card-shadow-opacity: 0.25;
        }
        @media (min-width: 990px) {
          :root {
            --page-width: 1600px;
            --spacing-sections: 4rem;
            --spacing-grid-horizontal: 28px;
            --spacing-grid-vertical: 28px;
          }
        }
        .desktop-only {
          display: block;
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: block;
          }
        }
      `}</style>

      <main
        style={{
          direction: "rtl",
          fontFamily: "var(--font-body-family)",
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
          fontSize: "calc(1rem * var(--font-body-scale))",
          lineHeight: 1.6,
        }}
      >
        {INDEX_DATA.order.map((sectionId) => {
          const section = INDEX_DATA.sections[sectionId];
          if (!section) return null;

          switch (section.type) {
            case "slideshow":
              return (
                <section
                  key={sectionId}
                  style={{ marginBottom: "var(--spacing-sections)" }}
                >
                  <div
                    style={{
                      maxWidth: "var(--page-width)",
                      margin: "0 auto",
                      padding: "0 var(--spacing-grid-horizontal)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "var(--spacing-grid-vertical)",
                        marginBottom: "var(--spacing-sections)",
                      }}
                    >
                      {section.block_order?.map((blockId) => {
                        const block = section.blocks[blockId];
                        return block ? (
                          <SlideCard key={blockId} s={block.settings} />
                        ) : null;
                      })}
                    </div>
                  </div>
                </section>
              );

            case "video":
              return (
                <section
                  key={sectionId}
                  style={{ marginBottom: "var(--spacing-sections)" }}
                >
                  <div
                    style={{
                      maxWidth: "var(--page-width)",
                      margin: "0 auto",
                      padding: "0 var(--spacing-grid-horizontal)",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "var(--media-radius)",
                        padding: "var(--spacing-grid-vertical)",
                        textAlign: "center",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {section.settings.heading && (
                        <h2
                          style={{
                            fontSize: "2rem",
                            marginBottom: "1rem",
                            color: "#e8e8e8",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: section.settings.heading,
                          }}
                        />
                      )}
                      {section.settings.cover_image && (
                        <div
                          style={{
                            position: "relative",
                            paddingBottom: "56.25%",
                            marginBottom: "1rem",
                            borderRadius: 12,
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={resolveMedia(section.settings.cover_image)}
                            alt="فيديو تعليمي"
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}
                      {section.settings.description && (
                        <p style={{ color: "#d1d5db", fontSize: "1.1rem" }}>
                          {section.settings.description}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              );

            case "image-banner": {
              const hasTwoImages =
                section.settings.image && section.settings.image_2;

              if (hasTwoImages) {
                return (
                  <section
                    key={sectionId}
                    style={{ marginBottom: "var(--spacing-sections)" }}
                  >
                    <div
                      style={{
                        maxWidth: "var(--page-width)",
                        margin: "0 auto",
                        padding: "0 var(--spacing-grid-horizontal)",
                      }}
                    >
                      <div className="desktop-only">
                        <div
                          style={{
                            position: "relative",
                            borderRadius: 16,
                            overflow: "hidden",
                            minHeight: "400px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background:
                              "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
                          }}
                        >
                          <img
                            src={resolveMedia(section.settings.image)}
                            alt="بانر إعلاني"
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              opacity: 0.9,
                            }}
                          />
                          <div
                            style={{
                              position: "relative",
                              zIndex: 2,
                              textAlign: "center",
                              color: "white",
                              padding: "2rem",
                            }}
                          >
                            {section.block_order?.map((blockId) => {
                              const block = section.blocks[blockId];
                              if (!block) return null;

                              if (
                                block.type === "heading" &&
                                block.settings.heading
                              ) {
                                return (
                                  <h2
                                    key={blockId}
                                    style={{
                                      fontSize:
                                        "calc(1.8rem * var(--font-heading-scale))",
                                      marginBottom: "1rem",
                                      fontWeight: 700,
                                      fontFamily:
                                        "var(--font-heading-family)",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {stripHtml(block.settings.heading)}
                                  </h2>
                                );
                              }

                              if (
                                block.type === "text" &&
                                block.settings.text
                              ) {
                                return (
                                  <p
                                    key={blockId}
                                    style={{
                                      fontSize:
                                        "calc(1.1rem * var(--font-body-scale))",
                                      marginBottom: "1.5rem",
                                      opacity: 0.95,
                                      fontFamily: "var(--font-body-family)",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {stripHtml(block.settings.text)}
                                  </p>
                                );
                              }

                              if (block.type === "buttons") {
                                return (
                                  <div
                                    key={blockId}
                                    style={{
                                      display: "flex",
                                      gap: "1rem",
                                      justifyContent: "center",
                                      flexWrap: "wrap",
                                      flexDirection: "row",
                                    }}
                                  >
                                    {block.settings.button_label_1 && (
                                      <Link
                                        href={
                                          resolveLink(
                                            block.settings.button_link_1
                                          ) || "#"
                                        }
                                        style={{
                                          display: "inline-block",
                                          padding: "0.75rem 1.5rem",
                                          backgroundColor:
                                            "var(--color-button)",
                                          color:
                                            "var(--color-button-text)",
                                          textDecoration: "none",
                                          borderRadius:
                                            "var(--buttons-radius)",
                                          fontWeight: 600,
                                          border:
                                            "3px solid var(--color-button)",
                                          fontSize:
                                            "calc(0.9rem * var(--font-body-scale))",
                                          fontFamily:
                                            "var(--font-body-family)",
                                          boxShadow:
                                            "var(--buttons-shadow-horizontal-offset) var(--buttons-shadow-vertical-offset) var(--buttons-shadow-blur) rgba(0,0,0,.45)",
                                          minWidth: "120px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {block.settings.button_label_1}
                                      </Link>
                                    )}
                                    {block.settings.button_label_2 && (
                                      <Link
                                        href={
                                          resolveLink(
                                            block.settings.button_link_2
                                          ) || "#"
                                        }
                                        style={{
                                          display: "inline-block",
                                          padding: "0.75rem 1.5rem",
                                          backgroundColor:
                                            "var(--color-secondary-button)",
                                          color:
                                            "var(--color-button-text)",
                                          textDecoration: "none",
                                          borderRadius:
                                            "var(--buttons-radius)",
                                          fontWeight: 600,
                                          border:
                                            "3px solid var(--color-secondary-button)",
                                          fontSize:
                                            "calc(0.9rem * var(--font-body-scale))",
                                          fontFamily:
                                            "var(--font-body-family)",
                                          boxShadow:
                                            "var(--buttons-shadow-horizontal-offset) var(--buttons-shadow-vertical-offset) var(--buttons-shadow-blur) rgba(0,0,0,.45)",
                                          minWidth: "120px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {block.settings.button_label_2}
                                      </Link>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mobile-only">
                        <div
                          style={{
                            borderRadius: 16,
                            overflow: "hidden",
                            marginBottom: "1rem",
                          }}
                        >
                          <img
                            src={resolveMedia(section.settings.image)}
                            alt="بانر إعلاني 1"
                            style={{
                              width: "100%",
                              height: "200px",
                              objectFit: "cover",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            padding: "1.5rem",
                            background: "#f8f9fa",
                            borderRadius: 16,
                            marginBottom: "1rem",
                          }}
                        >
                          {section.block_order?.map((blockId) => {
                            const block = section.blocks[blockId];
                            if (!block) return null;

                            if (
                              block.type === "heading" &&
                              block.settings.heading
                            ) {
                              return (
                                <h2
                                  key={blockId}
                                  style={{
                                    fontSize: "1.8rem",
                                    marginBottom: "1rem",
                                    fontWeight: 700,
                                    color: "#2d3748",
                                  }}
                                >
                                  {stripHtml(block.settings.heading)}
                                </h2>
                              );
                            }

                            if (
                              block.type === "text" &&
                              block.settings.text
                            ) {
                              return (
                                <p
                                  key={blockId}
                                  style={{
                                    fontSize: "1.1rem",
                                    marginBottom: "1.5rem",
                                    color: "#718096",
                                  }}
                                >
                                  {stripHtml(block.settings.text)}
                                </p>
                              );
                            }

                            if (block.type === "buttons") {
                              return (
                                <div
                                  key={blockId}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "1rem",
                                    alignItems: "center",
                                  }}
                                >
                                  {block.settings.button_label_1 && (
                                    <Link
                                      href={
                                        resolveLink(
                                          block.settings.button_link_1
                                        ) || "#"
                                      }
                                      style={{
                                        display: "inline-block",
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor:
                                          "var(--color-button)",
                                        color: "var(--color-button-text)",
                                        textDecoration: "none",
                                        borderRadius:
                                          "var(--buttons-radius)",
                                        fontWeight: 600,
                                        fontSize:
                                          "calc(0.9rem * var(--font-body-scale))",
                                        fontFamily:
                                          "var(--font-body-family)",
                                        width: "85%",
                                        textAlign: "center",
                                        maxWidth: "280px",
                                        minHeight: "45px",
                                        border:
                                          "3px solid var(--color-button)",
                                        boxShadow:
                                          "var(--buttons-shadow-horizontal-offset) var(--buttons-shadow-vertical-offset) var(--buttons-shadow-blur) rgba(0,0,0,.45)",
                                      }}
                                    >
                                      {block.settings.button_label_1}
                                    </Link>
                                  )}
                                  {block.settings.button_label_2 && (
                                    <Link
                                      href={
                                        resolveLink(
                                          block.settings.button_link_2
                                        ) || "#"
                                      }
                                      style={{
                                        display: "inline-block",
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor:
                                          "var(--color-secondary-button)",
                                        color: "var(--color-button-text)",
                                        textDecoration: "none",
                                        borderRadius:
                                          "var(--buttons-radius)",
                                        fontWeight: 600,
                                        fontSize:
                                          "calc(0.9rem * var(--font-body-scale))",
                                        fontFamily:
                                          "var(--font-body-family)",
                                        width: "85%",
                                        textAlign: "center",
                                        maxWidth: "280px",
                                        minHeight: "45px",
                                        border:
                                          "3px solid var(--color-secondary-button)",
                                        boxShadow:
                                          "var(--buttons-shadow-horizontal-offset) var(--buttons-shadow-vertical-offset) var(--buttons-shadow-blur) rgba(0,0,0,.45)",
                                      }}
                                    >
                                      {block.settings.button_label_2}
                                    </Link>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>

                        <div style={{ borderRadius: 16, overflow: "hidden" }}>
                          <img
                            src={resolveMedia(section.settings.image_2)}
                            alt="بانر إعلاني 2"
                            style={{
                              width: "100%",
                              height: "200px",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              // بانر بصورة واحدة
              return (
                <section key={sectionId} style={{ marginBottom: "3rem" }}>
                  <div
                    style={{
                      maxWidth: "1400px",
                      margin: "0 auto",
                      padding: "0 1rem",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 16,
                        overflow: "hidden",
                        minHeight: "400px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(135deg, #9422af 0%, #7c1d8a 100%)",
                      }}
                    >
                      {section.settings.image && (
                        <img
                          src={resolveMedia(section.settings.image)}
                          alt="بانر إعلاني"
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: 0.9,
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "relative",
                          zIndex: 2,
                          textAlign: "center",
                          color: "white",
                          padding: "2rem",
                        }}
                      >
                        {section.block_order?.map((blockId) => {
                          const block = section.blocks[blockId];
                          if (!block) return null;

                          if (
                            block.type === "heading" &&
                            block.settings.heading
                          ) {
                            return (
                              <h2
                                key={blockId}
                                style={{
                                  fontSize: "2.5rem",
                                  marginBottom: "1rem",
                                  fontWeight: 700,
                                }}
                              >
                                {stripHtml(block.settings.heading)}
                              </h2>
                            );
                          }

                          if (
                            block.type === "text" &&
                            block.settings.text
                          ) {
                            return (
                              <p
                                key={blockId}
                                style={{
                                  fontSize: "1.3rem",
                                  marginBottom: "1.5rem",
                                  opacity: 0.95,
                                }}
                              >
                                {stripHtml(block.settings.text)}
                              </p>
                            );
                          }

                          if (block.type === "buttons") {
                            return (
                              <div
                                key={blockId}
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  justifyContent: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                {block.settings.button_label_1 && (
                                  <Link
                                    href={
                                      resolveLink(
                                        block.settings.button_link_1
                                      ) || "#"
                                    }
                                    style={{
                                      display: "inline-block",
                                      padding: "0.75rem 2rem",
                                      backgroundColor:
                                        "rgba(255,255,255,0.2)",
                                      color: "white",
                                      textDecoration: "none",
                                      borderRadius: 10,
                                      fontWeight: 600,
                                      border:
                                        "2px solid rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    {block.settings.button_label_1}
                                  </Link>
                                )}
                                {block.settings.button_label_2 && (
                                  <Link
                                    href={
                                      resolveLink(
                                        block.settings.button_link_2
                                      ) || "#"
                                    }
                                    style={{
                                      display: "inline-block",
                                      padding: "0.75rem 2rem",
                                      backgroundColor:
                                        "rgba(255,255,255,0.2)",
                                      color: "white",
                                      textDecoration: "none",
                                      borderRadius: 10,
                                      fontWeight: 600,
                                      border:
                                        "2px solid rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    {block.settings.button_label_2}
                                  </Link>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            case "featured-collection":
              return (
                <section
                  key={sectionId}
                  style={{ marginBottom: "var(--spacing-sections)" }}
                >
                  <div
                    style={{
                      maxWidth: "var(--page-width)",
                      margin: "0 auto",
                      padding: "0 var(--spacing-grid-horizontal)",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        marginBottom: "var(--spacing-grid-vertical)",
                      }}
                    >
                      {section.settings.title && (
                        <h2
                          style={{
                            fontSize: "2rem",
                            marginBottom: "1rem",
                            color: "#e8e8e8",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: section.settings.title,
                          }}
                        />
                      )}
                      {section.settings.description && (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: section.settings.description,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 2rem",
                        backgroundColor: "#f8f9fa",
                        color: "#2d3748",
                        borderRadius: 16,
                      }}
                    >
                      <p
                        style={{
                          fontSize: "1.1rem",
                          marginBottom: "1.5rem",
                        }}
                      >
                        استكشف مجموعة {section.name || "منتجاتنا المميزة"}
                      </p>
                      <Link
                        href={`/collections/${
                          section.settings.collection || "all"
                        }`}
                        style={{
                          display: "inline-block",
                          padding: "0.75rem 2rem",
                          backgroundColor: "#9422af",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: 10,
                          fontWeight: 600,
                        }}
                      >
                        عرض المجموعة
                      </Link>
                    </div>
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}
      </main>
    </>
  );
}
