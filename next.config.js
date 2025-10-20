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
    // ← التاريخ المطلوب
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || '2025-07',
  },

  async redirects() {
    return [
      { source: '/policies', destination: '/contact-information', permanent: false },
      { source: '/policies/:path*', destination: '/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
