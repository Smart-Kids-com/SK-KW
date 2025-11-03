// app/sitemap.js
import { getCollections, getProducts } from "@/lib/shopify";

// تُعيد مصفوفة كائنات بالصيغة التي يقبلها Next (App Router) للسيت ماب
export default async function sitemap() {
  const baseUrl = "https://smartkidskw.com";
  const now = new Date();

  // صفحات ثابتة (القانونية)
  const staticPages = [
    { url: `${baseUrl}/`,                          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${baseUrl}/collections`,               lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${baseUrl}/collections/all`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },

    // صفحات Shopify الثابتة
    { url: `${baseUrl}/pages/about-us`,           lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/pages/contact-us`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },

    // السياسات (Shopify shop policies + صفحة معلومات التواصل كسياسة)
    { url: `${baseUrl}/policies/privacy-policy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/policies/terms-of-service`,lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/policies/shipping-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/policies/refund-policy`,   lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/policies/contact-information`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },

    // المدوّنة الافتراضية (مضمون)
    { url: `${baseUrl}/blogs/news`,               lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
  ];

  // نحاول نجلب كوليكشنز وبرودكتس، ولو فشل نرجّع الثابت فقط
  let collections = [];
  let products = [];
  try {
    const [c, p] = await Promise.all([
      getCollections(100),
      getProducts(100),
    ]);
    collections = Array.isArray(c) ? c : [];
    products   = Array.isArray(p) ? p : [];
  } catch (e) {
    // فشل الجلب من Shopify -> نرجّع الستاتيك فقط
    return staticPages;
  }

  const collectionPages = collections
    .filter(Boolean)
    .map((c) => ({
      url: `${baseUrl}/collections/${encodeURIComponent(c.handle)}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const productPages = products
    .filter(Boolean)
    .map((p) => ({
      url: `${baseUrl}/products/${encodeURIComponent(p.handle)}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticPages, ...collectionPages, ...productPages];
}
