// lib/shopify.js

// Shopify API
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.warn('Missing Shopify environment variables');
}

const API_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2025-07/graphql.json`;

async function fetchShopifyGraphQL(query, variables = {}) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.errors) {
      console.error('GraphQL errors:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL error');
    }

    return json.data;
  } catch (error) {
    console.error('Shopify API Error:', error);
    throw error;
  }
}

export function formatKWD(amount) {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

export async function getCollections(first = 24) {
  const q = `query ($first:Int!) {
    collections(first:$first, sortKey:UPDATED_AT, reverse:true) {
      edges { 
        node { 
          id 
          handle 
          title 
          descriptionHtml 
          image{url altText} 
        } 
      }
    }
  }`;
  const d = await fetchShopifyGraphQL(q, { first });
  return (d.collections?.edges || []).map(e => e.node);
}

export async function getProducts(first = 24) {
  const q = `query ($first:Int!) {
    products(first:$first, sortKey:UPDATED_AT, reverse:true) {
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
  }`;
  const d = await fetchShopifyGraphQL(q, { first });
  return (d.products?.edges || []).map(e => e.node);
}

export async function getProductByHandle(handle) {
  const q = `query ($handle:String!) {
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
  }`;
  const d = await fetchShopifyGraphQL(q, { handle });
  const p = d.product || null;
  if (!p) return null;
  return {
    ...p,
    images: (p.images?.edges || []).map(e => e.node),
    variants: (p.variants?.edges || []).map(e => e.node),
  };
}

export async function getCollectionByHandle(handle, productsFirst = 24) {
  const q = `query ($handle:String!, $first:Int!) {
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
  }`;
  const d = await fetchShopifyGraphQL(q, { handle, first: productsFirst });
  const c = d.collection || null;
  if (!c) return null;
  return { ...c, products: (c.products?.edges || []).map(e => e.node) };
}

// Wishlist functions
export function getWishlist() {
  if (typeof window === 'undefined') return [];
  const wishlist = localStorage.getItem('wishlist');
  return wishlist ? JSON.parse(wishlist) : [];
}

export function addToWishlist(productId) {
  if (typeof window === 'undefined') return;
  const wishlist = getWishlist();
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }
}

export function removeFromWishlist(productId) {
  if (typeof window === 'undefined') return;
  const wishlist = getWishlist();
  const newWishlist = wishlist.filter(id => id !== productId);
  localStorage.setItem('wishlist', JSON.stringify(newWishlist));
}

export function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

export async function getProductsByIds(ids) {
  const q = `query ($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id handle title featuredImage { url altText }
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }`;
  const d = await fetchShopifyGraphQL(q, { ids });
  return d.nodes || [];
}

export async function getShopPolicies() {
  const q = `query {
    shop {
      privacyPolicy { body handle title }
      refundPolicy { body handle title }
      shippingPolicy { body handle title }
      termsOfService { body handle title }
    }
  }`;
  const d = await fetchShopifyGraphQL(q);
  return d.shop;
}

export async function createCustomer(email, password, firstName, lastName) {
  const q = `mutation ($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id email firstName lastName }
      customerUserErrors { field message }
    }
  }`;
  const input = { email, password, firstName, lastName };
  const d = await fetchShopifyGraphQL(q, { input });
  return d.customerCreate;
}

export async function customerLogin(email, password) {
  const q = `mutation ($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { field message }
    }
  }`;
  const input = { email, password };
  const d = await fetchShopifyGraphQL(q, { input });
  return d.customerAccessTokenCreate;
}

export { fetchShopifyGraphQL };
