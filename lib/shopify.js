// Environment validation// Environment validation// Environment validation

if (!process.env.SHOPIFY_STORE_DOMAIN) {

  throw new Error('Missing SHOPIFY_STORE_DOMAIN in .env');if (!process.env.SHOPIFY_STORE_DOMAIN) {if (!process.env.SHOPIFY_STORE_DOMAIN) {

}

if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {  throw new Error('Missing SHOPIFY_STORE_DOMAIN in .env');  throw new Error('Missing SHOPIFY_STORE_DOMAIN in .env');

  throw new Error('Missing SHOPIFY_STOREFRONT_API_TOKEN in .env');

}}}



const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {if (!process.env.SHOPIFY_STOREFRONT_API_TOKEN) {

const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

const API_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;  throw new Error('Missing SHOPIFY_STOREFRONT_API_TOKEN in .env');  throw new Error('Missing SHOPIFY_STOREFRONT_API_TOKEN in .env');



// GraphQL API Helper}}

async function fetchShopifyGraphQL(query, variables = {}) {

  try {

    const response = await fetch(API_ENDPOINT, {

      method: 'POST',const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

      headers: {

        'Content-Type': 'application/json',const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,

      },

      body: JSON.stringify({ query, variables }),

      cache: 'no-store'const API_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;const API_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

    });



    if (!response.ok) {

      throw new Error(`HTTP error! status: ${response.status}`);// GraphQL API Helper// GraphQL API Helper

    }

async function fetchShopifyGraphQL(query, variables = {}) {async function fetchShopifyGraphQL(query, variables = {}) {

    const json = await response.json();

      try {  try {

    if (json.errors) {

      console.error('GraphQL errors:', json.errors);    const response = await fetch(API_ENDPOINT, {    const response = await fetch(API_ENDPOINT, {

      throw new Error(json.errors[0]?.message || 'GraphQL error');

    }      method: 'POST',      method: 'POST',



    return json.data;      headers: {      headers: {

  } catch (error) {

    console.error('Shopify API Error:', error);        'Content-Type': 'application/json',        'Content-Type': 'application/json',

    throw error;

  }        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCES// =============== Utilities ===============

}

      },export function moneyToNumber(m) {

// Currency Formatter

export function formatKWD(amount) {      body: JSON.stringify({ query, variables }),  // m: { amount, currencyCode } => Number(amount)

  return new Intl.NumberFormat('ar-KW', {

    style: 'currency',      cache: 'no-store' // تجنب الكاش للحصول على بيانات حديثة  if (!m) return 0;

    currency: 'KWD',

    minimumFractionDigits: 3,    });  const n = Number(m.amount);

    maximumFractionDigits: 3,

  }).format(amount);  return Number.isFinite(n) ? n : 0;

}

    if (!response.ok) {}     },

// =============== Collections ===============

export async function getCollections(first = 24) {      throw new Error(`HTTP error! status: ${response.status}`);      body: JSON.stringify({ query, variables }),

  const q = /* GraphQL */ `

    query ($first:Int!) {    }      cache: 'no-store' // تجنب الكاش للحصول على بيانات حديثة

      collections(first:$first, sortKey:UPDATED_AT, reverse:true) {

        edges { node { id handle title description image{url altText} } }    });

      }

    }    const json = await response.json();

  `;

  const d = await fetchShopifyGraphQL(q, { first });        if (!response.ok) {

  return (d.collections?.edges || []).map(e => e.node);

}    if (json.errors) {      throw new Error(`HTTP error! status: ${response.status}`);



export async function getCollectionByHandle(handle, productsFirst = 24) {      console.error('GraphQL errors:', json.errors);    }

  const q = /* GraphQL */ `

    query ($handle:String!, $first:Int!) {      throw new Error(json.errors[0]?.message || 'GraphQL error');

      collection(handle:$handle) {

        id handle title description image{url altText}    }    const json = await response.json();

        products(first:$first) {

          edges {    

            node {

              id handle title featuredImage{url altText}    return json.data;    if (json.errors) {

              priceRange {

                minVariantPrice { amount currencyCode }  } catch (error) {      console.error('GraphQL errors:', json.errors);

                maxVariantPrice { amount currencyCode }

              }    console.error('Shopify API Error:', error);      throw new Error(json.errors[0]?.message || 'GraphQL error');

            }

          }    throw error;    }

        }

      }  }

    }

  `;}    return json.data;

  const d = await fetchShopifyGraphQL(q, { handle, first: productsFirst });

  const c = d.collection || null;  } catch (error) {

  if (!c) return null;

  return { ...c, products: (c.products?.edges || []).map(e => e.node) };// Currency Formatter    console.error('Shopify API Error:', error);

}

export function formatKWD(amount) {    throw error;

// =============== Products ===============

export async function getProducts(first = 24) {  return new Intl.NumberFormat('ar-KW', {  }

  const q = /* GraphQL */ `

    query ($first:Int!) {    style: 'currency',}

      products(first:$first, sortKey:UPDATED_AT, reverse:true) {

        edges {    currency: 'KWD',

          node {

            id handle title featuredImage{url altText}    minimumFractionDigits: 3,// Currency Formatter

            priceRange {

              minVariantPrice { amount currencyCode }    maximumFractionDigits: 3,export function formatKWD(amount) {

              maxVariantPrice { amount currencyCode }

            }  }).format(amount);  return new Intl.NumberFormat('ar-KW', {

          }

        }}    style: 'currency',

      }

    }    currency: 'KWD',

  `;

  const d = await fetchShopifyGraphQL(q, { first });// =============== Customer Accounts ===============    minimumFractionDigits: 3,

  return (d.products?.edges || []).map(e => e.node);

}export async function createCustomer(email, password, firstName, lastName) {    maximumFractionDigits: 3,



export async function getProductByHandle(handle) {  const q = /* GraphQL */ `  }).format(amount);

  const q = /* GraphQL */ `

    query ($handle:String!) {    mutation ($input: CustomerCreateInput!) {}

      product(handle:$handle) {

        id handle title descriptionHtml      customerCreate(input: $input) {

        featuredImage { url altText }

        images(first: 20) { edges { node { url altText } } }        customer { id email firstName lastName }// =============== Customer Accounts ===============

        priceRange {

          minVariantPrice { amount currencyCode }        customerUserErrors { field message }export async function createCustomer(email, password, firstName, lastName) {

          maxVariantPrice { amount currencyCode }

        }      }  const q = /* GraphQL */ `

        variants(first: 100) {

          edges {    }    mutation ($input: CustomerCreateInput!) {

            node {

              id title availableForSale sku  `;      customerCreate(input: $input) {

              selectedOptions { name value }

              price { amount currencyCode }  const input = { email, password, firstName, lastName };        customer { id email firstName lastName }

              compareAtPrice { amount currencyCode }

            }  const d = await fetchShopifyGraphQL(q, { input });        customerUserErrors { field message }

          }

        }  return d.customerCreate;      }

      }

    }}    }

  `;

  const d = await fetchShopifyGraphQL(q, { handle });  `;

  const p = d.product || null;

  if (!p) return null;export async function customerLogin(email, password) {  const input = { email, password, firstName, lastName };

  return {

    ...p,  const q = /* GraphQL */ `  const d = await fetchShopifyGraphQL(q, { input });

    images: (p.images?.edges || []).map(e => e.node),

    variants: (p.variants?.edges || []).map(e => e.node),    mutation ($input: CustomerAccessTokenCreateInput!) {  if (d.customerCreate?.customerUserErrors?.length) {

  };

}      customerAccessTokenCreate(input: $input) {    throw new Error(d.customerCreate.customerUserErrors.map(e => e.message).join(" | "));



// =============== Wishlist Functions ===============        customerAccessToken { accessToken expiresAt }  }

export function getWishlist() {

  if (typeof window === 'undefined') return [];        customerUserErrors { field message }  return d.customerCreate.customer;

  const wishlist = localStorage.getItem('wishlist');

  return wishlist ? JSON.parse(wishlist) : [];      }}

}

    }

export function addToWishlist(productId) {

  if (typeof window === 'undefined') return;  `;export async function customerLogin(email, password) {

  const wishlist = getWishlist();

  if (!wishlist.includes(productId)) {  const input = { email, password };  const q = /* GraphQL */ `

    wishlist.push(productId);

    localStorage.setItem('wishlist', JSON.stringify(wishlist));  const d = await fetchShopifyGraphQL(q, { input });    mutation ($input: CustomerAccessTokenCreateInput!) {

  }

}  return d.customerAccessTokenCreate;      customerAccessTokenCreate(input: $input) {



export function removeFromWishlist(productId) {}        customerAccessToken { accessToken expiresAt }

  if (typeof window === 'undefined') return;

  const wishlist = getWishlist();        customerUserErrors { field message }

  const newWishlist = wishlist.filter(id => id !== productId);

  localStorage.setItem('wishlist', JSON.stringify(newWishlist));// =============== Collections ===============      }

}

export async function getCollections(first = 24) {    }

export function isInWishlist(productId) {

  return getWishlist().includes(productId);  const q = /* GraphQL */ `  `;

}

    query ($first:Int!) {  const d = await fetchShopifyGraphQL(q, { input: { email, password } });

export async function getProductsByIds(ids) {

  const q = /* GraphQL */ `      collections(first:$first, sortKey:UPDATED_AT, reverse:true) {  if (d.customerAccessTokenCreate?.customerUserErrors?.length) {

    query ($ids: [ID!]!) {

      nodes(ids: $ids) {        edges { node { id handle title description image{url altText} } }    throw new Error(d.customerAccessTokenCreate.customerUserErrors.map(e => e.message).join(" | "));

        ... on Product {

          id handle title featuredImage { url altText }      }  }

          priceRange {

            minVariantPrice { amount currencyCode }    }  return d.customerAccessTokenCreate.customerAccessToken;

          }

        }  `;}

      }

    }  const d = await fetchShopifyGraphQL(q, { first });

  `;

  const d = await fetchShopifyGraphQL(q, { ids });  return (d.collections?.edges || []).map(e => e.node);export async function getCustomer(accessToken) {

  return d.nodes || [];

}}  const q = /* GraphQL */ `



// =============== Shop Policies ===============    query ($accessToken: String!) {

export async function getShopPolicies() {

  const q = /* GraphQL */ `export async function getCollectionByHandle(handle, productsFirst = 24) {      customer(customerAccessToken: $accessToken) {

    query {

      shop {  const q = /* GraphQL */ `        id email firstName lastName phone

        privacyPolicy { body handle title }

        refundPolicy { body handle title }    query ($handle:String!, $first:Int!) {        defaultAddress { address1 city country province zip }

        shippingPolicy { body handle title }

        termsOfService { body handle title }      collection(handle:$handle) {        orders(first: 20) {

      }

    }        id handle title description image{url altText}          edges {

  `;

  const d = await fetchShopifyGraphQL(q);        products(first:$first) {            node {

  return d.shop;

}          edges {              id orderNumber totalPrice { amount currencyCode }



// =============== Customer Accounts ===============            node {              processedAt fulfillmentStatus

export async function createCustomer(email, password, firstName, lastName) {

  const q = /* GraphQL */ `              id handle title featuredImage{url altText}            }

    mutation ($input: CustomerCreateInput!) {

      customerCreate(input: $input) {              priceRange {          }

        customer { id email firstName lastName }

        customerUserErrors { field message }                minVariantPrice { amount currencyCode }        }

      }

    }                maxVariantPrice { amount currencyCode }      }

  `;

  const input = { email, password, firstName, lastName };              }    }

  const d = await fetchShopifyGraphQL(q, { input });

  return d.customerCreate;            }  `;

}

          }  const d = await fetchShopifyGraphQL(q, { accessToken });

export async function customerLogin(email, password) {

  const q = /* GraphQL */ `        }  const customer = d.customer;

    mutation ($input: CustomerAccessTokenCreateInput!) {

      customerAccessTokenCreate(input: $input) {      }  if (!customer) return null;

        customerAccessToken { accessToken expiresAt }

        customerUserErrors { field message }    }  return {

      }

    }  `;    ...customer,

  `;

  const input = { email, password };  const d = await fetchShopifyGraphQL(q, { handle, first: productsFirst });    orders: (customer.orders?.edges || []).map(e => e.node)

  const d = await fetchShopifyGraphQL(q, { input });

  return d.customerAccessTokenCreate;  const c = d.collection || null;  };

}

  if (!c) return null;}

// Export the fetchShopifyGraphQL function

export { fetchShopifyGraphQL };  return { ...c, products: (c.products?.edges || []).map(e => e.node) };

}// =============== Pages & SEO ===============

export async function getPages(first = 20) {

// =============== Products ===============  const q = /* GraphQL */ `

export async function getProducts(first = 24) {    query ($first: Int!) {

  const q = /* GraphQL */ `      pages(first: $first) {

    query ($first:Int!) {        edges {

      products(first:$first, sortKey:UPDATED_AT, reverse:true) {          node {

        edges {            id handle title bodySummary body createdAt updatedAt

          node {            seo { title description }

            id handle title featuredImage{url altText}          }

            priceRange {        }

              minVariantPrice { amount currencyCode }      }

              maxVariantPrice { amount currencyCode }    }

            }  `;

          }  const d = await fetchShopifyGraphQL(q, { first });

        }  return (d.pages?.edges || []).map(e => e.node);

      }}

    }

  `;export async function getPageByHandle(handle) {

  const d = await fetchShopifyGraphQL(q, { first });  const q = /* GraphQL */ `

  return (d.products?.edges || []).map(e => e.node);    query ($handle: String!) {

}      pageByHandle(handle: $handle) {

        id handle title body bodySummary createdAt updatedAt

export async function getProductByHandle(handle) {        seo { title description }

  const q = /* GraphQL */ `      }

    query ($handle:String!) {    }

      product(handle:$handle) {  `;

        id handle title descriptionHtml  const d = await fetchShopifyGraphQL(q, { handle });

        featuredImage { url altText }  return d.pageByHandle;

        images(first: 20) { edges { node { url altText } } }}

        priceRange {

          minVariantPrice { amount currencyCode }// =============== Policies ===============

          maxVariantPrice { amount currencyCode }export async function getShopPolicies() {

        }  const q = /* GraphQL */ `

        variants(first: 100) {    query {

          edges {      shop {

            node {        privacyPolicy { body handle id title url }

              id title availableForSale sku        refundPolicy { body handle id title url }

              selectedOptions { name value }        shippingPolicy { body handle id title url }

              price { amount currencyCode }        termsOfService { body handle id title url }

              compareAtPrice { amount currencyCode }      }

            }    }

          }  `;

        }  const d = await fetchShopifyGraphQL(q);

      }  return d.shop;

    }}

  `;

  const d = await fetchShopifyGraphQL(q, { handle });// =============== Utilities ===============

  const p = d.product || null;export function moneyToNumber(m) {

  if (!p) return null;  if (!m) return 0;

  return {  const n = Number(m.amount);

    ...p,  return Number.isFinite(n) ? n : 0;

    images: (p.images?.edges || []).map(e => e.node),}

    variants: (p.variants?.edges || []).map(e => e.node),

  };export function formatKWD(amount) {

}  // تنسيق السعر بالدينار الكويتي فقط

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

// =============== Cart Functions ===============  return new Intl.NumberFormat('ar-KW', {

export async function createCart(lines = [], buyerIdentity = null) {    style: 'currency',

  const q = /* GraphQL */ `    currency: 'KWD',

    mutation ($lines:[CartLineInput!], $buyer: CartBuyerIdentityInput) {    minimumFractionDigits: 3,

      cartCreate(input: { lines: $lines, buyerIdentity: $buyer }) {    maximumFractionDigits: 3

        cart {  }).format(num);

          id}

          checkoutUrl

          totalQuantityexport function edgesToArray(conn) {

          cost { subtotalAmount { amount currencyCode } }  return (conn?.edges || []).map(e => e.node);

        }}

        userErrors { field message }

      }// =============== Advanced Product Features ===============

    }export async function getProductRecommendations(productId, limit = 10) {

  `;  const q = /* GraphQL */ `

  const d = await fetchShopifyGraphQL(q, { lines, buyer: buyerIdentity });    query ($productId: ID!, $limit: Int!) {

  if (d.cartCreate?.userErrors?.length) {      productRecommendations(productId: $productId) {

    throw new Error(d.cartCreate.userErrors.map(e => e.message).join(" | "));        id handle title featuredImage { url altText }

  }        priceRange {

  return d.cartCreate.cart;          minVariantPrice { amount currencyCode }

}        }

      }

export async function getCart(cartId) {    }

  const q = /* GraphQL */ `  `;

    query ($id:ID!) {  const d = await fetchShopifyGraphQL(q, { productId, limit });

      cart(id:$id) {  return d.productRecommendations || [];

        id}

        checkoutUrl

        totalQuantityexport async function getProductsByIds(ids) {

        cost { subtotalAmount { amount currencyCode } }  const q = /* GraphQL */ `

        lines(first: 100) {    query ($ids: [ID!]!) {

          edges {      nodes(ids: $ids) {

            node {        ... on Product {

              id          id handle title featuredImage { url altText }

              quantity          priceRange {

              merchandise {            minVariantPrice { amount currencyCode }

                __typename          }

                ... on ProductVariant {        }

                  id title      }

                  price { amount currencyCode }    }

                  product { title featuredImage { url altText } }  `;

                }  const d = await fetchShopifyGraphQL(q, { ids });

              }  return d.nodes || [];

            }}

          }

        }// =============== Checkout & Orders ===============

      }export async function getCheckoutUrl(cartId) {

    }  const q = /* GraphQL */ `

  `;    query ($id: ID!) {

  const d = await fetchShopifyGraphQL(q, { id: cartId });      cart(id: $id) {

  const c = d.cart || null;        checkoutUrl

  if (!c) return null;      }

  return {    }

    ...c,  `;

    lines: (c.lines?.edges || []).map(e => e.node),  const d = await fetchShopifyGraphQL(q, { id: cartId });

  };  return d.cart?.checkoutUrl;

}}



// =============== Wishlist Functions ===============// =============== Shop Information ===============

export function getWishlist() {export async function getShopInfo() {

  if (typeof window === 'undefined') return [];  const q = /* GraphQL */ `

  const wishlist = localStorage.getItem('wishlist');    query {

  return wishlist ? JSON.parse(wishlist) : [];      shop {

}        name description

        primaryDomain { url }

export function addToWishlist(productId) {        paymentSettings {

  if (typeof window === 'undefined') return;          acceptedCardBrands

  const wishlist = getWishlist();          cardVaultUrl

  if (!wishlist.includes(productId)) {          countryCode

    wishlist.push(productId);          currencyCode

    localStorage.setItem('wishlist', JSON.stringify(wishlist));          supportedDigitalWallets

  }        }

}      }

    }

export function removeFromWishlist(productId) {  `;

  if (typeof window === 'undefined') return;  const d = await fetchShopifyGraphQL(q);

  const wishlist = getWishlist();  return d.shop;

  const newWishlist = wishlist.filter(id => id !== productId);}

  localStorage.setItem('wishlist', JSON.stringify(newWishlist));

}// =============== Currency & Localization ===============

export async function getAvailableCountries() {

export function isInWishlist(productId) {  const q = /* GraphQL */ `

  return getWishlist().includes(productId);    query {

}      localization {

        availableCountries {

export async function getProductsByIds(ids) {          isoCode name currency { isoCode name }

  const q = /* GraphQL */ `        }

    query ($ids: [ID!]!) {      }

      nodes(ids: $ids) {    }

        ... on Product {  `;

          id handle title featuredImage { url altText }  const d = await fetchShopifyGraphQL(q);

          priceRange {  return d.localization?.availableCountries || [];

            minVariantPrice { amount currencyCode }}

          }

        }// =============== Wishlist (المفضلة) ===============

      }export function getWishlist() {

    }  if (typeof window === 'undefined') return [];

  `;  const wishlist = localStorage.getItem('wishlist');

  const d = await fetchShopifyGraphQL(q, { ids });  return wishlist ? JSON.parse(wishlist) : [];

  return d.nodes || [];}

}

export function addToWishlist(productId) {

// =============== Shop Policies ===============  if (typeof window === 'undefined') return;

export async function getShopPolicies() {  const wishlist = getWishlist();

  const q = /* GraphQL */ `  if (!wishlist.includes(productId)) {

    query {    wishlist.push(productId);

      shop {    localStorage.setItem('wishlist', JSON.stringify(wishlist));

        privacyPolicy { body handle title }  }

        refundPolicy { body handle title }}

        shippingPolicy { body handle title }

        termsOfService { body handle title }export function removeFromWishlist(productId) {

      }  if (typeof window === 'undefined') return;

    }  const wishlist = getWishlist();

  `;  const newWishlist = wishlist.filter(id => id !== productId);

  const d = await fetchShopifyGraphQL(q);  localStorage.setItem('wishlist', JSON.stringify(newWishlist));

  return d.shop;}

}

export function isInWishlist(productId) {

// Export the fetchShopifyGraphQL function  return getWishlist().includes(productId);

export { fetchShopifyGraphQL };}

// =============== Product Reviews (التقييمات) ===============
export async function getProductReviews(productId, first = 20) {
  // ملاحظة: Shopify لا يدعم التقييمات بشكل مباشر في Storefront API
  // يمكن استخدام Shopify Product Reviews app أو نظام خارجي
  const q = /* GraphQL */ `
    query ($productId: ID!) {
      product(id: $productId) {
        metafields(first: 10, namespace: "reviews") {
          edges {
            node {
              key
              value
              type
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { productId });
  return d.product?.metafields?.edges?.map(e => e.node) || [];
}

// =============== Inventory & Stock (المخزون) =============== 
export async function getProductInventory(productId) {
  const q = /* GraphQL */ `
    query ($productId: ID!) {
      product(id: $productId) {
        variants(first: 100) {
          edges {
            node {
              id
              availableForSale
              quantityAvailable
              currentlyNotInStock
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { productId });
  return d.product?.variants?.edges?.map(e => e.node) || [];
}

// =============== Advanced Search & Filters ===============
export async function searchProductsWithFilters({ 
  query = '', 
  sortKey = 'RELEVANCE', 
  reverse = false,
  productType = '',
  vendor = '',
  priceMin = null,
  priceMax = null,
  available = null,
  first = 24 
}) {
  let searchQuery = query;
  
  // إضافة فلاتر للبحث
  if (productType) searchQuery += ` product_type:${productType}`;
  if (vendor) searchQuery += ` vendor:${vendor}`;
  if (available !== null) searchQuery += ` available:${available}`;
  if (priceMin) searchQuery += ` variants.price:>=${priceMin}`;
  if (priceMax) searchQuery += ` variants.price:<=${priceMax}`;

  const q = /* GraphQL */ `
    query ($query: String!, $first: Int!, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
      products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges {
          node {
            id handle title productType vendor
            featuredImage { url altText }
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            availableForSale
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `;
  
  const d = await fetchShopifyGraphQL(q, { 
    query: searchQuery.trim() || '*', 
    first, 
    sortKey, 
    reverse 
  });
  
  return {
    products: (d.products?.edges || []).map(e => e.node),
    pageInfo: d.products?.pageInfo || {}
  };
}

// =============== KWD Currency Helper ===============
// =============== Discount Codes (كوبونات الخصم) ===============
export async function applyDiscountCode(cartId, discountCode) {
  const q = /* GraphQL */ `
    mutation ($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          id
          discountCodes { code applicable }
          cost {
            subtotalAmount { amount currencyCode }
            totalAmount { amount currencyCode }            
            totalTaxAmount { amount currencyCode }
          }
        }
        userErrors { field message }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { cartId, discountCodes: [discountCode] });
  if (d.cartDiscountCodesUpdate?.userErrors?.length) {
    throw new Error(d.cartDiscountCodesUpdate.userErrors.map(e => e.message).join(" | "));
  }
  return d.cartDiscountCodesUpdate.cart;
}

// =============== Shipping Options (خيارات الشحن) ===============
export async function getShippingRates(cartId, deliveryAddress) {
  // ملاحظة: يتطلب Shopify Plus أو Checkout API
  const q = /* GraphQL */ `
    query ($cartId: ID!) {
      cart(id: $cartId) {
        deliveryGroups(first: 5) {
          edges {
            node {
              id
              deliveryOptions {
                title
                description
                price { amount currencyCode }
                estimatedTimeInTransit {
                  minimum
                  maximum
                }
              }
            }
          }
        }
      }
    }
  `;
  const d = await fetchShopifyGraphQL(q, { cartId });
  return d.cart?.deliveryGroups?.edges?.map(e => e.node) || [];
}

// =============== Currency & Localization Helpers ===============
export function ensureKWD(priceRange) {
  // تأكد أن السعر بالدينار الكويتي فقط
  if (!priceRange) return null;
  
  const min = priceRange.minVariantPrice;
  const max = priceRange.maxVariantPrice;
  
  return {
    minVariantPrice: {
      amount: min?.amount || '0',
      currencyCode: 'KWD'
    },
    maxVariantPrice: {
      amount: max?.amount || min?.amount || '0', 
      currencyCode: 'KWD'
    }
  };
}

export function translateText(key, locale = 'ar') {
  // نظام ترجمة بسيط
  const translations = {
    'ar': {
      'add_to_cart': 'أضف إلى السلة',
      'buy_now': 'اشتر الآن', 
      'sold_out': 'نفدت الكمية',
      'on_sale': 'خصم',
      'free_shipping': 'شحن مجاني',
      'in_stock': 'متوفر',
      'out_of_stock': 'غير متوفر'
    },
    'en': {
      'add_to_cart': 'Add to Cart',
      'buy_now': 'Buy Now',
      'sold_out': 'Sold Out', 
      'on_sale': 'On Sale',
      'free_shipping': 'Free Shipping',
      'in_stock': 'In Stock',
      'out_of_stock': 'Out of Stock'
    }
  };
  
  return translations[locale]?.[key] || key;
}

// Generic fetcher
export async function fetchShopifyGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_API_TOKEN,
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
    throw new Error(`Shopify GraphQ error: ${msg}`);
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
  return (conn?.edges || []).map(e => e.node);
}