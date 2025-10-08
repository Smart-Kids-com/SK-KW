// app/page.js
// Headless homepage that mirrors your Shopify index.json (order + sections)

import Link from "next/link";

// ========= إعدادات عامة =========
// عدّل الـ CDN_BASE لو مسار ملفات متجرك مختلف
const CDN_BASE = "https://cdn.shopify.com/s/files/1/0697/3318/7805";

// يحوّل shopify://* إلى روابط فعلية + يحوّل روابط كولكشن/برودكت لمسارات موقعك
function resolveMedia(url) {
  if (!url) return "";
  if (url.startsWith("shopify://shop_images/")) {
    const file = url.replace("shopify://shop_images/", "");
    return `${CDN_BASE}/files/${file}`;
  }
  if (url.startsWith("shopify://files/")) {
    // ملاحظة: ملفات الفيديو/الملفات العامة أحيانًا تبقى على نفس CDN الصور
    // لو ما اشتغل، حط رابط الفيديو المباشر (mp4/mov) زي ما عملت أنت سابقًا.
    const file = url.replace("shopify://files/", "");
    return `${CDN_BASE}/files/${file}`;
  }
  return url; // http(s) عادي
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

// ========= البيانات كما وصلَت من Shopify =========
const INDEX_DATA = {
  sections: {
    slideshow_yCfbqK: {
      type: "slideshow",
      blocks: {
        slide_BYwnED: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/CACBDA84-1389-4CC4-B050-3B0244AE7EF0.png",
            heading: "<strong>العرض التعليمي التفاعلي الصوتي</strong>",
            heading_size: "h1",
            subheading: "أصوات الحيوانات+ يوم في حياة طفل",
            button_label: "اطلب العرض",
            link: "shopify://collections/عروض-القصص-التفاعلية",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "",
            text_alignment_mobile: "center",
          },
        },
        slide_XB3gLB: {
          type: "slide",
          settings: {
            image:
              "shopify://shop_images/2_ee3fd101-3134-4523-a4de-84f0b0e1048f.png",
            heading: "<strong>قلمي السحري</strong>",
            heading_size: "h0",
            subheading: "<strong>كتبي الناطقة 22 كتاباً ناطقاً بالقلم</strong>",
            button_label: "تصفح عرض الحقيبة",
            link:
              "shopify://products/الحقيبة-التعليمية-الناطقة-بالقلم-عربي-إنجليزي",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "",
            text_alignment_mobile: "center",
          },
        },
        slide_FY3ncx: {
          type: "slide",
          settings: {
            image:
              "shopify://shop_images/5_ba4fbd2f-e7fe-4cf7-ba1d-0e9f5e233a71.png",
            heading: "<strong>القصص ثلاثية الأبعاد</strong>",
            heading_size: "h1",
            subheading: "التشويق بكل صفحة",
            button_label: "تصفح العرض",
            link:
              "shopify://products/استمتع-برحلة-تفاعلية-مع-8-قصص-ثلاثية-الأبعاد",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-1",
            text_alignment_mobile: "center",
          },
        },
        slide_ELEfDi: {
          type: "slide",
          settings: {
            image:
              "shopify://shop_images/F71B6DAA-F5D1-4964-9EFD-54A2EF5874B2.png",
            heading: "<strong>قصص الأنبياء-12 كتاباً</strong>",
            heading_size: "h0",
            subheading: "اقتفِ أثر الأنبياء 👣",
            button_label: "دع أطفالك يتعلمون منهم📖🕋",
            link: "shopify://products/قصص-الأنبياء-12-25-نبياً",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-1",
            text_alignment_mobile: "center",
          },
        },
        slide_acQWrJ: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/0110-8150864765604275633.jpg",
            heading: "<strong>عرض ال 29 كتاباً للصغار</strong>",
            heading_size: "h1",
            subheading: "العرض الذهبي",
            button_label: "!اطلب الآن",
            link: "shopify://collections/الكُتب-المُحببة-للأطفال",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "",
            text_alignment_mobile: "center",
          },
        },
      },
      block_order: [
        "slide_BYwnED",
        "slide_XB3gLB",
        "slide_FY3ncx",
        "slide_ELEfDi",
        "slide_acQWrJ",
      ],
      settings: {
        layout: "full_bleed",
        slide_height: "adapt_image",
        slider_visual: "numbers",
        auto_rotate: true,
        change_slides_speed: 9,
        image_behavior: "none",
        show_text_below: true,
        accessibility_info: "أفضل الكتب التفاعلية والإسلامية",
      },
    },

    slideshow_8gH9XG: {
      type: "slideshow",
      blocks: {
        slide_mJfJKL: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/2_b2a829e7-3d4b-49fc-baae-66c1d6f715d7.png",
            heading: "Education Kids Boxes",
            heading_size: "h2",
            subheading: "<strong>Letters And Words</strong>",
            button_label: "العرض المدرسي المميز",
            link:
              "shopify://products/حقيبة-أنا-أركب-الكلمات-مع-3-حقائب-مونتيسوري-التفاعلية",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: false,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-ed791349-3459-4c60-b19f-742f179c4a5e",
            text_alignment_mobile: "center",
          },
        },
        slide_EGgjif: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/1_3935205c-67ae-4194-bfe7-b4ec7481ee09.png",
            heading: "<strong>Reading Pen</strong>",
            heading_size: "h1",
            subheading: "With Learning Books",
            button_label: "قلم القراءة المتدرجة الناطق",
            link: "shopify://collections/ابدأ-رحلتك-مع-القلم-الناطق",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-02821578-8dca-4bae-8db6-b44263f39014",
            text_alignment_mobile: "center",
          },
        },
        slide_Ai8X6n: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/Slidshow.png",
            heading: "Interactive Stories",
            heading_size: "h2",
            subheading: "",
            button_label: "احصل على العرض الآن",
            link: "shopify://collections/عروض-القصص-التفاعلية",
            button_style_secondary: true,
            box_align: "bottom-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "",
            text_alignment_mobile: "center",
          },
        },
        slide_red7eg: {
          type: "slide",
          settings: {
            image:
              "shopify://shop_images/Slidshow_6ce563f1-be3b-4998-b5ce-53d5ea447d37.png",
            heading:
              '<a href="/collections/عروض-القصص-التفاعلية" title="عروض القصص التفاعلية">Discover The Kids 3D Stories</a>',
            heading_size: "h2",
            subheading: "<strong>القصص ثلاثية الأبعاد</strong>",
            button_label: "اطلب العرض",
            link: "shopify://collections/عروض-القصص-التفاعلية",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-02821578-8dca-4bae-8db6-b44263f39014",
            text_alignment_mobile: "center",
          },
        },
        slide_xJXgnY: {
          type: "slide",
          settings: {
            image: "shopify://shop_images/c376a0415b19dc4b35ab2f32cf34bb90.png",
            heading:
              '<a href="/collections/قصصي-الصوتية-المسموعة" title="قصصي الصوتية المسموعة"><strong>Audio storybooks</strong></a>',
            heading_size: "h2",
            subheading: "<strong>أصوات الحيوانات</strong>",
            button_label: "اطلبها الآن",
            link: "shopify://collections/قصصي-الصوتية-المسموعة",
            button_style_secondary: true,
            box_align: "middle-center",
            show_text_box: true,
            text_alignment: "center",
            image_overlay_opacity: 0,
            color_scheme: "scheme-02821578-8dca-4bae-8db6-b44263f39014",
            text_alignment_mobile: "center",
          },
        },
      },
      block_order: [
        "slide_mJfJKL",
        "slide_EGgjif",
        "slide_Ai8X6n",
        "slide_red7eg",
        "slide_xJXgnY",
      ],
      settings: {
        layout: "grid",
        slide_height: "adapt_image",
        slider_visual: "numbers",
        auto_rotate: true,
        change_slides_speed: 9,
        image_behavior: "none",
        show_text_below: true,
        accessibility_info: "كتب تفاعلية, ثلاثية الأبعاد, متحركة وصوتية",
      },
    },

    video_H4ERG: {
      type: "video",
      settings: {
        heading: "<strong>المسلم الصغير 4 كتب  صوتية للأطفال </strong> 🔊",
        heading_size: "h2",
        enable_video_looping: true,
        video: "shopify://files/videos/IMG_4971.MP4",
        video_url: "https://www.youtube.com/watch?v=_9VUPq3SxOc",
        description: "al muslim alsaghir video",
        full_width: false,
        color_scheme: "",
        padding_top: 60,
        padding_bottom: 64,
      },
    },

    video_8eqz9: {
      type: "video",
      settings: {
        heading: "",
        heading_size: "h2",
        enable_video_looping: true,
        video:
          "shopify://files/videos/D1F626D6-C982-4367-878E-B79E2847FE4E.MOV",
        video_url: "https://www.youtube.com/watch?v=_9VUPq3SxOc",
        cover_image:
          "shopify://shop_images/89B2B8AD-F0DE-45DB-9432-BBFB3AEDF881.png",
        description: "قصص الأنبياء مبسطة للأطفال",
        full_width: true,
        color_scheme: "scheme-7e46585f-22cd-4803-b3e2-37445cdbc038",
        padding_top: 0,
        padding_bottom: 0,
      },
    },

    image_banner_AcTJ4k: {
      type: "image-banner",
      blocks: {
        buttons_PnmGy4: {
          type: "buttons",
          settings: {
            button_label_1: "تصفح المكتبة الصوتية",
            button_link_1: "shopify://collections/قصصي-الصوتية-المسموعة",
            button_style_secondary_1: true,
            button_label_2: "",
            button_link_2:
              "shopify://products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً",
            button_style_secondary_2: true,
          },
        },
        heading_T9w47W: {
          type: "heading",
          settings: {
            heading: "",
            heading_size: "h0",
          },
        },
      },
      block_order: ["buttons_PnmGy4", "heading_T9w47W"],
      settings: {
        image:
          "shopify://shop_images/F316B75B-DCC6-4857-852B-84ACD098C4BA.png",
        image_overlay_opacity: 0,
        image_height: "adapt",
        desktop_content_position: "middle-right",
        show_text_box: false,
        desktop_content_alignment: "right",
        color_scheme: "scheme-7e46585f-22cd-4803-b3e2-37445cdbc038",
        image_behavior: "none",
        mobile_content_alignment: "center",
        stack_images_on_mobile: true,
        show_text_below: true,
      },
    },

    image_banner_wEJyB: {
      type: "image-banner",
      blocks: {
        buttons_ErpGhJ: {
          type: "buttons",
          settings: {
            button_label_1: "",
            button_link_1: "shopify://collections/قصصي-الصوتية-المسموعة",
            button_style_secondary_1: true,
            button_label_2: "تصفح عرض ال 12 قصة تفاعلية",
            button_link_2:
              "shopify://products/حرك-شاهد-تفاعل-مع-12-كتاباً-تفاعلياً",
            button_style_secondary_2: true,
          },
        },
        heading_tCYPgQ: {
          type: "heading",
          settings: {
            heading: "",
            heading_size: "h0",
          },
        },
      },
      block_order: ["buttons_ErpGhJ", "heading_tCYPgQ"],
      settings: {
        image: "shopify://shop_images/12_0b33362f-ac9c-42a6-b66d-141bd30f535b.png",
        image_overlay_opacity: 0,
        image_height: "adapt",
        desktop_content_position: "bottom-center",
        show_text_box: false,
        desktop_content_alignment: "right",
        color_scheme: "scheme-7e46585f-22cd-4803-b3e2-37445cdbc038",
        image_behavior: "none",
        mobile_content_alignment: "right",
        stack_images_on_mobile: true,
        show_text_below: true,
      },
    },

    featured_collection_A9VzML: {
      type: "featured-collection",
      name: "عروض القصص التفاعلية",
      settings: {
        title: "عروض القصص التفاعلية",
        collection: "عروض-القصص-التفاعلية",
      },
    },

    featured_collection_Jb8QcA: {
      type: "featured-collection",
      name: "اكتشف أحدث إصداراتنا للأطفال",
      settings: {
        title: "اكتشف أحدث إصداراتنا للأطفال",
        collection: "اكتشف-أحدث-إصداراتنا-للأطفال",
      },
    },

    video_U4WJHz: {
      type: "video",
      settings: {
        heading: "<strong>القصص التدريجية </strong>",
        video: "shopify://files/videos/2FD7E0EB-0D92-42EB-AB11-EAB99A0A5772.mov",
        cover_image: "shopify://shop_images/photo_5897638831199470906_y.jpg",
        description: "قصص تدريجية من أربعة مستويات",
      },
    },

    image_banner_VFVeX8: {
      type: "image-banner",
      blocks: {
        heading_HX8fWD: {
          type: "heading",
          settings: { heading: "القصص الإسلامية", heading_size: "h1" },
        },
        text_JkjQMf: {
          type: "text",
          settings: {
            text: "<strong>مجموعة كتب إسلامية رائعة للصغار</strong>",
            text_style: "subtitle",
          },
        },
        buttons_kKde8U: {
          type: "buttons",
          settings: {
            button_label_1: "تصفح القصص الإسلامية",
            button_link_1: "shopify://collections/عروض-مكتبتي-الإسلامية",
            button_style_secondary_1: true,
            button_label_2: "تصفح الكتب التفاعلية",
            button_link_2: "shopify://collections/كتبي-التفاعلية-الحركية",
            button_style_secondary_2: true,
          },
        },
      },
      block_order: ["heading_HX8fWD", "text_JkjQMf", "buttons_kKde8U"],
      settings: {
        image: "shopify://shop_images/Design_ff56ed71-1320-418f-9ba9-4aadddd6b67d.png",
        image_2: "shopify://shop_images/eacbdb1567d11534690ae02b2fbb39df.png",
        image_overlay_opacity: 0,
        image_height: "adapt",
        desktop_content_position: "bottom-center",
        show_text_box: true,
        desktop_content_alignment: "center",
        image_behavior: "none",
        mobile_content_alignment: "center",
        stack_images_on_mobile: true,
        show_text_below: true,
      },
    },

    featured_collection_nKegfD: {
      type: "featured-collection",
      name: "المجموعات المتميزة",
      settings: {
        title: "👇🏻<strong>المجموعات المتميزة</strong>",
        collection: "الكُتب-المُحببة-للأطفال",
      },
    },

    featured_collection_XjDqn9: {
      type: "featured-collection",
      name: "مجموعات إسلامية مميزة",
      settings: {
        title: "<strong>مجموعات إسلامية مميزة 🕋</strong>",
        collection: "عروض-مكتبتي-الإسلامية",
      },
    },

    featured_collection_KwjCG: {
      type: "featured-collection",
      name: "القصص المفردة للأطفال",
      settings: {
        title: "",
        description: "<h1><strong>القصص المفردة للأطفال</strong></h1>",
        collection: "qesas-mofrada-lel-atfal",
      },
    },
  },

  order: [
    "slideshow_yCfbqK",
    "slideshow_8gH9XG",
    "video_H4ERG",
    "video_8eqz9",
    "image_banner_AcTJ4k",
    "image_banner_wEJyB",
    "featured_collection_A9VzML",
    "featured_collection_Jb8QcA",
    "video_U4WJHz",
    "image_banner_VFVeX8",
    "featured_collection_nKegfD",
    "featured_collection_XjDqn9",
    "featured_collection_KwjCG",
  ],
};

// Helpers لاستخراج الرابط من heading عند اللزوم
function extractHrefFromHTML(html = "") {
  const m = html.match(/href="([^"]+)"/i);
  return m ? m[1] : null;
}

function safeHrefFromSlide(s = {}) {
  // 1) من settings.link لو موجود
  if (s.link) return resolveLink(s.link);
  // 2) أو من <a href="..."> داخل heading
  const fromHeading = extractHrefFromHTML(s.heading || "");
  if (fromHeading) return resolveLink(fromHeading);
  // 3) مفيش رابط
  return null;
}

// لو ما عندكش الدالة دي فوق الملف، ضيفها:
function stripHtml(html) {
  return (html || "").replace(/<[^>]*>?/gm, "");
}

// ========= SlideCard (نسخة مصححة) =========
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
          }}
        />
      </div>

      {(s.heading || s.subheading || s.button_label) && (
        <div style={{ padding: 16 }}>
          {s.heading && (
            <div
              style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}
              // لو خايف من روابط داخل heading تعمل nested links، استخدم السطر التالي بدلًا من السطر الحالي:
              // dangerouslySetInnerHTML={{ __html: (s.heading || "").replace(/<\/?a[^>]*>/g, "") }}
              dangerouslySetInnerHTML={{ __html: s.heading }}
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
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
  };

  // مهم: <Link> لازم يتقفل، ولو مفيش href بنرجّع <div>
  return href ? (
    <Link href={href} style={cardStyle}>
      {content}
    </Link>
  ) : (
    <div style={cardStyle}>{content}</div>
  );
}
// ========= المكون الرئيسي للصفحة الرئيسية =========