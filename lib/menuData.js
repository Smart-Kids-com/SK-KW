// lib/menuData.js
import SideMenuCollections from "@/components/SideMenuCollections";
const items = [
  { title: "الصفحة الرئيسية", href: "smartkiskw.com" }, // صفحة البداية
  { title: "اكتشف أحدث إصداراتنا للأطفال", href: "/collections/اكتشف-أحدث-إصداراتنا-للأطفال" },
  { title: "تسوّق جميع منتجاتنا الآن", href: "/collections/تسوّق-جميع-منتجاتنا-الآن" },
  { title: "عروض مكتبتي الإسلامية", href: "/collections/عروض-مكتبتي-الإسلامية" },
  { title: "قصصي الصوتية المسموعة", href: "/collections/قصصي-الصوتية-المسموعة" },
  { title: "الكُتب المُحببة للأطفال", href: "/collections/الكُتب-المُحببة-للأطفال" },
  { title: "أنا أقرأ بنفسي", href: "/collections/أنا-أقرأ-بنفسي" },
  { title: "ابدأ رحلتك مع القلم الناطق", href: "/collections/ابدأ-رحلتك-مع-القلم-الناطق" },
  { title: "عروض القصص التفاعلية", handle: "collections/عروض-القصص-التفاعلية" },
  { title: "كتبي التفاعلية الحركية", href: "/collections/كتبي-التفاعلية-الحركية" },
  { title: "القصص المفردة للأطفال", href: "/collections/qesas-mofrada-lel-atfal" },
  { title: "موسوعات التاريخ المصور", href: "/collections/موسوعات-التاريخ-المصور" },
  { title: "جميع المنتجات", href: "collections/all" },
  { title: "الأفضل مبيعاً", href: "/collections/smart-kids-kuwait-الأفضل-مبيعاً-الأطفال-المبتكرون-الكويت" },
  { title: "كل المجموعات", href: "collections" },
  { title: "عالم القصص والحكايات المصورة", href: "/collections/عالم-القصص-والحكايات-المصورة" },
  { title: "مونتيسوري", href: "/collections/مونتيسوري" },
  { title: "ABOUT US", href: "pages/about-us" },
  { title: "Contact Us", href: "pages/contact-us" },
  { title: "مضمون", href: "blogs/news" },
  { title: "Profile", href: "Customer_access_Token" } // تُركت كما طلبت
];

function encodePath(p) {
  return p
    .replace(/^\/+/, "")                // شيل أي سلاشات بادئة
    .split("/")
    .map(seg => encodeURIComponent(seg))
    .join("/");
}

function makeHref(item) {
  if (item.href !== undefined) return encodePath(item.href);
  const h = (item.handle || "").trim();
  if (!h) return "";
  let path = h.replace(/^\/+/, "");
  if (path.startsWith("collections/") || path.startsWith("pages/") || path.startsWith("blogs/")) {
    return encodePath(path);
  }
  // اعتبره handle لمجموعة
  return encodePath(`collections/${h}`);
}

export const sideMenu = Object.freeze(
  items.map(({ title, href, handle }) => ({ title, href: makeHref({ href, handle }) }))
);

export default sideMenu;
