// lib/menuData.js

/**
 * تعريف عناصر القائمة الجانبية/الرئيسية.
 * نوحّد الشكل: { title, href } والهرف لازم يبدأ بـ "/" ويتم ترميز الأجزاء العربية.
 */

const RAW_ITEMS = [
  { title: "الصفحة الرئيسية", href: "/" },
  { title: "اكتشف أحدث إصداراتنا للأطفال", href: "/collections/اكتشف-أحدث-إصداراتنا-للأطفال" },
  { title: "تسوق جميع منتجاتنا الآن", href: "/collections/تسوق-جميع-منتجاتنا-الآن" },
  { title: "عروض مكتبتي الإسلامية", href: "/collections/عروض-مكتبتي-الإسلامية" },
  { title: "قصصي الصوتية المسموعة", href: "/collections/قصصي-الصوتية-المسموعة" },
  { title: "الكُتب المُحببة للأطفال", href: "/collections/الكُتب-المُحببة-للأطفال" },
  { title: "أنا أقرأ بنفسي", href: "/collections/أنا-أقرأ-بنفسي" },
  { title: "ابدأ رحلتك مع القلم الناطق", href: "/collections/ابدأ-رحلتك-مع-القلم-الناطق" },
  { title: "عروض القصص التفاعلية", href: "/collections/عروض-القصص-التفاعلية" },
  { title: "كتبي التفاعلية الحركية", href: "/collections/كتبي-التفاعلية-الحركية" },
  { title: "القصص المفردة للأطفال", href: "/collections/qesas-mofrada-lel-atfal" },
  { title: "موسوعات التاريخ المصور", href: "/collections/موسوعات-التاريخ-المصور" },
  { title: "جميع المنتجات", href: "/collections/all" },
  { title: "الأفضل مبيعاً", href: "/collections/smart-kids-kuwait-الأفضل-مبيعاً-الأطفال-المبتكرون-الكويت" },
  { title: "كل المجموعات", href: "/collections" },
  { title: "عالم القصص والحكايات المصورة", href: "/collections/عالم-القصص-والحكايات-المصورة" },
  { title: "مونتيسوري", href: "/collections/مونتيسوري" },
  { title: "ABOUT US", href: "/pages/about-us" },
  { title: "Contact Us", href: "/pages/contact-us" },
  { title: "المقالات", href: "/blogs/news" }
];

function encodePath(path = "/") {
  if (!path.startsWith("/")) path = `/${path}`;
  return (
    "/" +
    path
      .replace(/^\/+/, "")
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/")
  );
}

export const sideMenu = Object.freeze(
  RAW_ITEMS.map(({ title, href }) => ({
    title,
    href: encodePath(href || "/"),
  }))
);

export default sideMenu;
