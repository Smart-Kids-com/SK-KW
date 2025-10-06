const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/s/files/**' }, // Shopify
      { protocol: 'https', hostname: 'smartkidskw.com', pathname: '/**' },         // موقعك
    ],
  },
  env: {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_API_TOKEN: process.env.SHOPIFY_STOREFRONT_API_TOKEN,
  },
};
module.exports = nextConfig;