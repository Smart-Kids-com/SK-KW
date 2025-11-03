// next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, "@": path.resolve(__dirname) };
    return config;
  },

  images: {
    remotePatterns: [
      // Shopify CDN
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/**" },

      // نطاقات الموقع المستخدمة في الصور
      { protocol: "https", hostname: "smart-kids.me", pathname: "/**" },
      { protocol: "https", hostname: "www.smart-kids.me", pathname: "/**" },
      { protocol: "https", hostname: "smartkidskw.com", pathname: "/**" },
      { protocol: "https", hostname: "www.smartkidskw.com", pathname: "/**" },
    ],
  },

  // توحيد نسخة الـ API مع lib/shopify.js لتجنّب تضارب الإصدارات
  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2024-07",
  },

  async redirects() {
    return [
      // إخفاء مسار فحص البيئة
      { source: "/api/check-env", destination: "/404", permanent: true },

      // توحيد “جميع المنتجات”
      { source: "/products", destination: "/collections/all", permanent: true },

      // إصلاح روابط السياسات الشائعة خارج /policies
      { source: "/privacy-policy", destination: "/policies/privacy-policy", permanent: true },
      { source: "/refund-policy", destination: "/policies/refund-policy", permanent: true },
      { source: "/terms-of-service", destination: "/policies/terms-of-service", permanent: true },
      { source: "/shipping-policy", destination: "/policies/shipping-policy", permanent: true },
      { source: "/contact-information", destination: "/policies/contact-information", permanent: true },

      // مسارات صفحات ثابتة يجب أن تذهب إلى صفحات Shopify
      { source: "/about-us", destination: "/pages/about-us", permanent: true },
      { source: "/contact-us", destination: "/pages/contact-us", permanent: true },

      // إصلاح مسارات قديمة بحروف كبيرة/غير قياسية
      { source: "/Pages/about-us", destination: "/pages/about-us", permanent: true },
      { source: "/Pages/contact-information", destination: "/policies/contact-information", permanent: true },
      { source: "/Page/contact-information", destination: "/policies/contact-information", permanent: true },
      { source: "/pages/contact-information", destination: "/policies/contact-information", permanent: true },

      // المدوّنة: منع handle = null + دعم رابط عربي "مضمون"
      { source: "/blogs", destination: "/blogs/news", permanent: true },
      { source: "/مضمون", destination: "/blogs/news", permanent: true },
    ];
  },
};

module.exports = nextConfig;
