// lib/cart.js
// Shopify Storefront Cart SDK for Next.js (App Router)

// نقبل أكتر من اسم للمتغيرات لتفادي أي اختلاف بين الملفات
const SHOPIFY_STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const SHOPIFY_STOREFRONT_API_TOKEN =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN;

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_STOREFRONT_API_VERSION ||
  process.env.SHOPIFY_API_VERSION ||
  "2024-07";

if (!SHOPIFY_STORE_DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN in environment.");
if (!SHOPIFY_STOREFRONT_API_TOKEN) throw new Error("Missing SHOPIFY_STOREFRONT_API_TOKEN in environment.");

const API_ENDPOINT = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function storefrontFetch(query, variables = {}) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
    throw new Error(`Shopify fetch failed: ${res.status} ${res.statusText} :: ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error("Shopify GraphQL errors: " + JSON.stringify(json.errors));
  }
  return json.data;
}

/**
 * مهم: أضفنا product.handle و product.featuredImage لأن الدروار/صفحة السلة بتعتمد عليهم.
 * زودنا compareAtPrice وبعض الحقول المفيدة.
 */
const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
    attributes { key value }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          attributes { key value }
          cost { totalAmount { amount currencyCode } }
          merchandise {
            __typename
            ... on ProductVariant {
              id
              title
              availableForSale
              image { url altText }
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              product {
                id
                handle
                title
                featuredImage { url altText }
              }
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

const CART_QUERY = `
  query cart($id: ID!) {
    cart(id: $id) { ...CartFields }
  }
  ${CART_FRAGMENT}
`;

const CART_LINES_ADD = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

const CART_LINES_UPDATE = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

const CART_LINES_REMOVE = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

function assertNoUserErrors(payload, opName) {
  const errors = payload?.userErrors || payload?.errors;
  if (errors && errors.length) {
    const msg = errors.map((e) => e.message || JSON.stringify(e)).join(" | ");
    throw new Error(`${opName} userErrors: ${msg}`);
  }
}

export async function createCart({ lines = [], attributes = [] } = {}) {
  const data = await storefrontFetch(CART_CREATE, { input: { lines, attributes } });
  assertNoUserErrors(data.cartCreate, "cartCreate");
  return data.cartCreate.cart;
}

export async function getCart(cartId) {
  if (!cartId) return null;
  const data = await storefrontFetch(CART_QUERY, { id: cartId });
  return data.cart || null;
}

export async function addLines(cartId, lines) {
  const data = await storefrontFetch(CART_LINES_ADD, { cartId, lines });
  assertNoUserErrors(data.cartLinesAdd, "cartLinesAdd");
  return data.cartLinesAdd.cart;
}

export async function updateLines(cartId, lines) {
  const data = await storefrontFetch(CART_LINES_UPDATE, { cartId, lines });
  assertNoUserErrors(data.cartLinesUpdate, "cartLinesUpdate");
  return data.cartLinesUpdate.cart;
}

export async function removeLines(cartId, lineIds) {
  const data = await storefrontFetch(CART_LINES_REMOVE, { cartId, lineIds });
  assertNoUserErrors(data.cartLinesRemove, "cartLinesRemove");
  return data.cartLinesRemove.cart;
}
