// lib/shopify.js
// Env (ضعها في Vercel أو .env.production):
// SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
// SHOPIFY_STOREFRONT_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

import { notFound } from "next/navigation";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
const API_VERSION    = "2025-07";
const API_URL        = "https://5844c0-56.myshopify.com";

function assertEnv() {
  if (!SHOPIFY_DOMAIN) throw new Error("Missing env SHOPIFY_STORE_DOMAIN");
  if (!SHOPIFY_TOKEN)  throw new Error("Missing env SHOPIFY_STOREFRONT_API_TOKEN");
}

// =============== Core Fetch ===============
export async function fetchShopifyGraphQL(query, variables = {}) {
  assertEnv();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN,
    },
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    const msg = json.errors.map(e => e.message).join(" | ");
    throw new Error(`Shopify_GraphQL_error: ${msg}`);
  }
  return json.data;
}

// =============== Collections ===============
export async function getCollections(first = 24) {
  const q = /* GraphQL */ `
    query ($first:Int!) {
      collections(first:$first, sortKey:UPDATED_AT, reverse:true) {
        edges { node { id handle title description image{url altText} } }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { first });
  return (d.collections?.edges || []).map(e => e.node);
}

export async function getCollectionByHandle(handle, productsFirst = 24) {
  const q = /* GraphQL */ `
    query ($handle:String!, $first:Int!) {
      collection(handle:$handle) {
        id handle title description image{url altText}
        products(first:$first) {
          edges {
            node {
              id handle title featuredImage{url altText}
              priceRange {
                minVariantPrice { amount currencyCode }
                maxVariantPrice { amount currencyCode }
              }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { handle, first: productsFirst });
  const c = d.collection || null;
  if (!c) return null;
  return { ...c, products: (c.products?.edges || []).map(e => e.node) };
}

// =============== Products ===============
export async function getProductByHandle(handle) {
  const q = /* GraphQL */ `
    query ($handle:String!) {
      product(handle:$handle) {
        id handle title descriptionHtml
        featuredImage { url altText }
        images(first: 20) { edges { node { url altText } } }
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        variants(first: 100) {
          edges {
            node {
              id title availableForSale sku
              selectedOptions { name value }
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { handle });
  const p = d.product || null;
  if (!p) return null;
  return {
    ...p,
    images: (p.images?.edges || []).map(e => e.node),
    variants: (p.variants?.edges || []).map(e => e.node),
  };
}

export async function searchProducts(queryString, first = 24) {
  // يستخدم storefront search عبر "products(query: ...)"
  const q = /* GraphQL */ `
    query ($q:String!, $first:Int!) {
      products(first:$first, query:$q, sortKey:RELEVANCE) {
        edges {
          node {
            id handle title featuredImage{url altText}
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { q: queryString, first });
  return (d.products?.edges || []).map(e => e.node);
}

// =============== Blogs & Articles ===============
export async function getBlogs(first = 20) {
  const q = /* GraphQL */ `
    query ($first:Int!) {
      blogs(first:$first, sortKey:UPDATED_AT, reverse:true) {
        edges { node { id handle title } }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { first });
  return (d.blogs?.edges || []).map(e => e.node);
}

export async function getArticlesByBlogHandle(blogHandle, first = 20) {
  const q = /* GraphQL */ `
    query ($handle:String!, $first:Int!) {
      blog(handle:$handle) {
        id handle title
        articles(first:$first, sortKey:PUBLISHED_AT, reverse:true) {
          edges {
            node {
              id handle title excerptHtml publishedAt
              image { url altText }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { handle: blogHandle, first });
  const b = d.blog || null;
  if (!b) return null;
  return { ...b, articles: (b.articles?.edges || []).map(e => e.node) };
}

export async function getArticleByHandle(blogHandle, articleHandle) {
  const q = /* GraphQL */ `
    query ($b:String!, $a:String!) {
      blog(handle:$b) {
        articleByHandle(handle:$a) {
          id handle title contentHtml excerptHtml publishedAt
          image { url altText }
          authorV2 { name }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { b: blogHandle, a: articleHandle });
  return d.blog?.articleByHandle || null;
}

// =============== Cart (Storefront API) ===============
export async function createCart(lines = [], buyerIdentity = null) {
  const q = /* GraphQL */ `
    mutation ($lines:[CartLineInput!], $buyer: CartBuyerIdentityInput) {
      cartCreate(input: { lines: $lines, buyerIdentity: $buyer }) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost { subtotalAmount { amount currencyCode } }
        }
        userErrors { field message }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { lines, buyer: buyerIdentity });
  if (d.cartCreate?.userErrors?.length) {
    throw new Error(d.cartCreate.userErrors.map(e => e.message).join(" | "));
  }
  return d.cartCreate.cart;
}

export async function getCart(cartId) {
  const q = /* GraphQL */ `
    query ($id:ID!) {
      cart(id:$id) {
        id
        checkoutUrl
        totalQuantity
        cost { subtotalAmount { amount currencyCode } }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                __typename
                ... on ProductVariant {
                  id title
                  price { amount currencyCode }
                  product { title featuredImage { url altText } }
                }
              }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { id: cartId });
  const c = d.cart || null;
  if (!c) return null;
  return {
    ...c,
    lines: (c.lines?.edges || []).map(e => e.node),
  };
}

export async function addToCart({ cartId, merchandiseId, quantity = 1, attributes = [] }) {
  const q = /* GraphQL */ `
    mutation ($cartId:ID!, $lines:[CartLineInput!]!) {
      cartLinesAdd(cartId:$cartId, lines:$lines) {
        cart {
          id totalQuantity
          cost { subtotalAmount { amount currencyCode } }
        }
        userErrors { field message }
      }
    }
  `;
  const vars = { cartId, lines: [{ merchandiseId, quantity, attributes }] };
  const d = await fetchShopifyGraphQL(q, vars);
  if (d.cartLinesAdd?.userErrors?.length) {
    throw new Error(d.cartLinesAdd.userErrors.map(e => e.message).join(" | "));
  }
  return d.cartLinesAdd.cart;
}

export async function updateCartLines(cartId, lineUpdates) {
  // lineUpdates: [{ id, quantity, attributes }]
  const q = /* GraphQL */ `
    mutation ($cartId:ID!, $lines:[CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId:$cartId, lines:$lines) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { cartId, lines: lineUpdates });
  if (d.cartLinesUpdate?.userErrors?.length) {
    throw new Error(d.cartLinesUpdate.userErrors.map(e => e.message).join(" | "));
  }
  return d.cartLinesUpdate.cart;
}

export async function removeCartLines(cartId, lineIds) {
  const q = /* GraphQL */ `
    mutation ($cartId:ID!, $lineIds:[ID!]!) {
      cartLinesRemove(cartId:$cartId, lineIds:$lineIds) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { cartId, lineIds });
  if (d.cartLinesRemove?.userErrors?.length) {
    throw new Error(d.cartLinesRemove.userErrors.map(e => e.message).join(" | "));
  }
  return d.cartLinesRemove.cart;
}

// =============== Utilities (اختياري تُبقيها معطلة إن مش محتاجها الآن) ===============
export function moneyToNumber(m) {
  // m: { amount, currencyCode } => Number(amount)
  if (!m) return 0;
  const n = Number(m.amount);
  return Number.isFinite(n) ? n : 0;
}

export function edgesToArray(conn) {
  return (conn?.edges || []).map(e => e.node);
}