// next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, '@': path.resolve(__dirname) };
    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/**' },
      { protocol: 'https', hostname: 'smartkidskw.com', pathname: '/**' },
    ],
  },

  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || '2025-07',
  },

  async redirects() {
    return [
      // إخفاء مسار فحص البيئة
      { source: '/api/check-env', destination: '/404', permanent: true },

      // توحيد “جميع المنتجات”
      { source: '/products', destination: '/collections/all', permanent: true },

      // إصلاح روابط السياسات الشائعة خارج /policies
      { source: '/privacy-policy', destination: '/policies/privacy-policy', permanent: true },
      { source: '/refund-policy', destination: '/policies/refund-policy', permanent: true },
      { source: '/terms-of-service', destination: '/policies/terms-of-service', permanent: true },
      { source: '/shipping-policy', destination: '/policies/shipping-policy', permanent: true },

      // إصلاح مسارات قديمة بحروف كبيرة
      { source: '/Pages/about-us', destination: '/pages/about-us', permanent: true },
      { source: '/Page/contact-information', destination: '/policies/contact-information', permanent: true },
      { source: '/Pages/Page/contact-information', destination: '/policies/contact-information', permanent: true },

      // لو عندك روابط داخلية إلى /pages/contact-information خلّيها تتحول للسياسة الصحيحة
      { source: '/pages/contact-information', destination: '/policies/contact-information', permanent: true },

      // منع خطأ blogs/$handle=null
      { source: '/blogs', destination: '/blogs/news', permanent: true },

      // ملاحظة: لا تضيف أي catch-all على /policies لتجنب الـ loop
      // وتم إزالة:
      // { source: '/policies', destination: '/contact-information', permanent: false },
      // { source: '/policies/:path*', destination: '/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
