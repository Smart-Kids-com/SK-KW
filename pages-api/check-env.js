// pages/api/check-env.js

export default function handler(req, res) {
  res.status(200).json({
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
    TOKEN_EXISTS: !!process.env.SHOPIFY_STOREFRONT_API_TOKEN
  });
}
