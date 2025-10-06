// lib/shopify.js (أو أي اسم اخترته)

// تحقق صارم من المتغيرات
if (!process.env.SHOPIFY_STORE_DOMAIN) {
  throw new Error('Missing SHOPIFY_STORE_DOMAIN in .env.local');
}
if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {
  throw new Error('Missing SHOPIFY_STOREFRONT_API_TOKEN in .env.local');
}

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // بدون https
const STOREFRONT_API_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-07';

// Generic fetcher (مع فحص HTTP و GraphQL errors)
export async function fetchShopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    // Next.js (App Router) ISR – عدّل الرقم براحتك
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify HTTP ${res.status} – ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

// جمع المجموعات (لاحظ image { url } بدلاً من src)
export async function getCollections(limit = 20) {
  const query = `
    query GetCollections($limit: Int!) {
      collections(first: $limit) {
        edges {
          node {
            handle
            title
            description
            image { url altText }
          }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(query, { limit });
  return (data.collections?.edges || []).map(e => e.node);
}

// مجموعة معيّنة + منتجاتها (url بدل src + تجهيز pagination لاحقًا)
export async function getCollectionByHandle(handle) {
  const query = `
    query ($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        description
        descriptionHtml
        image { url altText }
        products(first: 50) {
          edges {
            node {
              id
              handle
              title
              description
              featuredImage { url altText }
              priceRange {
                minVariantPrice { amount currencyCode }
                maxVariantPrice { amount currencyCode }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    availableForSale
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(query, { handle });
  const collection = data.collectionByHandle;
  if (!collection) return null;

  return {
    ...collection,
    products: (collection.products?.edges || []).map(edge => {
      const n = edge.node;
      return {
        ...n,
        featuredImage: n.featuredImage,
        price: n.priceRange?.minVariantPrice?.amount ?? null,
        currency: n.priceRange?.minVariantPrice?.currencyCode ?? null,
        variants: (n.variants?.edges || []).map(e => e.node),
      };
    }),
  };
}

// منتج معيّن (url بدل src)
export async function getProductByHandle(handle) {
  const query = `
    query ($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        description
        descriptionHtml
        featuredImage { url altText }
        availableForSale
        priceRange {
          minVariantPrice { amount currencyCode }
        }
        variants(first: 20) {
          edges {
            node {
              id
              title
              availableForSale
              selectedOptions { name value }
            }
          }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(query, { handle });
  const product = data.productByHandle;
  if (!product) return null;

  return {
    ...product,
    price: product.priceRange?.minVariantPrice?.amount ?? null,
    currency: product.priceRange?.minVariantPrice?.currencyCode ?? null,
    variants: (product.variants?.edges || []).map(e => e.node),
  };
}