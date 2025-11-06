// lib/shopify.js

function normalizeDomain(raw) {
  const s = String(raw || "").trim();
  return s.replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

const SHOPIFY_DOMAIN = normalizeDomain(
  process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
);

const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-07";

if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.warn("Missing Shopify env vars");
}

const API_ENDPOINT =
  "https://" + SHOPIFY_DOMAIN + "/api/" + SHOPIFY_API_VERSION + "/graphql.json";

async function fetchShopifyGraphQL(query, variables) {
  const vars = variables || {};
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN || ""
    },
    body: JSON.stringify({ query: query, variables: vars }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(function () { return ""; });
    throw new Error("HTTP " + res.status + ": " + text);
  }

  const json = await res.json();
  if (json && json.errors && json.errors.length) {
    throw new Error(json.errors[0].message || "GraphQL error");
  }
  return json.data;
}

export { fetchShopifyGraphQL };

export function formatKWD(amount) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ar-KW", {
    style: "currency",
    currency: "KWD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(isNaN(n) ? 0 : n);
}

export async function customerLogin(email, password) {
  const mutation =
    "mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {" +
    "  customerAccessTokenCreate(input: $input) {" +
    "    customerAccessToken { accessToken expiresAt }" +
    "    userErrors { field message }" +
    "  }" +
    "}";
  const data = await fetchShopifyGraphQL(mutation, { input: { email: email, password: password } });
  const res = data && data.customerAccessTokenCreate;
  const errs = (res && res.userErrors) || [];
  if (errs.length) throw new Error(errs[0].message || "Login failed");
  return (res && res.customerAccessToken) || null;
}

export async function createCustomer(email, password, firstName, lastName) {
  const mutation =
    "mutation customerCreate($input: CustomerCreateInput!) {" +
    "  customerCreate(input: $input) {" +
    "    customer { id email firstName lastName }" +
    "    userErrors { field message }" +
    "  }" +
    "}";
  const data = await fetchShopifyGraphQL(mutation, {
    input: {
      email: email,
      password: password,
      firstName: firstName || "",
      lastName: lastName || "",
      acceptsMarketing: false
    }
  });
  const res = data && data.customerCreate;
  const errs = (res && res.userErrors) || [];
  if (errs.length) throw new Error(errs[0].message || "Registration failed");
  return (res && res.customer) || null;
}

export async function getCollections(first) {
  const q =
    "query ($first:Int!) {" +
    "  collections(first:$first, sortKey:UPDATED_AT, reverse:true) {" +
    "    edges { node { id handle title description descriptionHtml image { url altText } updatedAt } }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { first: first || 24 });
  return (d.collections && d.collections.edges ? d.collections.edges : []).map(function (e) { return e.node; });
}

export async function getProducts(first, sortKey) {
  const q =
    "query ($first:Int!, $sortKey: ProductSortKeys!) {" +
    "  products(first:$first, sortKey:$sortKey, reverse:true) {" +
    "    edges { node {" +
    "      id handle title featuredImage { url altText }" +
    "      images(first: 5) { edges { node { url altText } } }" +
    "      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "      compareAtPriceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "      tags productType vendor availableForSale totalInventory createdAt updatedAt seo { title description }" +
    "    } }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, {
    first: first || 24,
    sortKey: sortKey || "UPDATED_AT"
  });
  return (d.products && d.products.edges ? d.products.edges : []).map(function (e) { return e.node; });
}

export async function getProductByHandle(handle) {
  const q =
    "query ($handle:String!) {" +
    "  product(handle:$handle) {" +
    "    id handle title descriptionHtml" +
    "    featuredImage { url altText }" +
    "    images(first: 20) { edges { node { url altText } } }" +
    "    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "    variants(first: 100) { edges { node {" +
    "      id title availableForSale sku" +
    "      selectedOptions { name value }" +
    "      price { amount currencyCode }" +
    "      compareAtPrice { amount currencyCode }" +
    "      quantityAvailable requiresShipping weight weightUnit" +
    "    } } }" +
    "    seo { title description }" +
    "    tags productType vendor createdAt updatedAt totalInventory availableForSale onlineStoreUrl" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { handle: handle });
  return d.product || null;
}

export async function getCollectionByHandle(handle, productsFirst) {
  const q =
    "query ($handle:String!, $first:Int!) {" +
    "  collection(handle:$handle) {" +
    "    id handle title description descriptionHtml image { url altText } seo { title description }" +
    "    products(first:$first) {" +
    "      edges { node {" +
    "        id handle title" +
    "        featuredImage { url altText }" +
    "        images(first: 5) { edges { node { url altText } } }" +
    "        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "        compareAtPriceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "        availableForSale totalInventory" +
    "        variants(first: 1) { edges { node { id availableForSale quantityAvailable } } }" +
    "      } }" +
    "    }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { handle: handle, first: productsFirst || 24 });
  const c = d.collection || null;
  if (!c) return null;
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    description: c.description,
    descriptionHtml: c.descriptionHtml,
    image: c.image,
    seo: c.seo,
    products: (c.products && c.products.edges ? c.products.edges : []).map(function (e) { return e.node; })
  };
}

export function getWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem("wishlist");
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}
export function addToWishlist(productId) {
  if (typeof window === "undefined") return;
  const w = getWishlist();
  if (w.indexOf(productId) === -1) {
    localStorage.setItem("wishlist", JSON.stringify(w.concat([productId])));
  }
}
export function removeFromWishlist(productId) {
  if (typeof window === "undefined") return;
  const w = getWishlist().filter(function (id) { return id !== productId; });
  localStorage.setItem("wishlist", JSON.stringify(w));
}
export function isInWishlist(productId) {
  return getWishlist().indexOf(productId) !== -1;
}

export async function getShopPolicies() {
  const q =
    "query ShopPolicies($contactHandle: String!) {" +
    "  shop {" +
    "    privacyPolicy  { body handle title }" +
    "    refundPolicy   { body handle title }" +
    "    shippingPolicy { body handle title }" +
    "    termsOfService { body handle title }" +
    "  }" +
    "  contactPage: page(handle: $contactHandle) { title body handle }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { contactHandle: "contact-information" });
  const shop = (d && d.shop) || {};
  const contact = d && d.contactPage ? d.contactPage : null;
  return {
    privacyPolicy: shop.privacyPolicy || null,
    refundPolicy: shop.refundPolicy || null,
    shippingPolicy: shop.shippingPolicy || null,
    termsOfService: shop.termsOfService || null,
    contactInformation: contact
      ? { body: contact.body, handle: contact.handle || "contact-information", title: contact.title || "معلومات التواصل" }
      : null
  };
}

export async function getAllBlogs(first) {
  const q =
    "query ($first: Int!) { blogs(first: $first) { edges { node { id title handle url } } } }";
  const d = await fetchShopifyGraphQL(q, { first: first || 10 });
  return (d.blogs && d.blogs.edges ? d.blogs.edges : []).map(function (e) { return e.node; });
}

export async function getBlogPosts(blogHandle, first) {
  const q =
    "query ($blogHandle: String!, $first: Int!) {" +
    "  blog(handle:$blogHandle) {" +
    "    id title handle" +
    "    articles(first:$first, sortKey:PUBLISHED_AT, reverse:true) {" +
    "      edges { node {" +
    "        id title handle excerpt excerptHtml contentHtml publishedAt updatedAt" +
    "        image { url altText } seo { title description } authorV2 { name } tags" +
    "      } }" +
    "    }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { blogHandle: blogHandle || "news", first: first || 24 });
  const blog = d.blog;
  if (!blog) return null;
  return {
    id: blog.id,
    title: blog.title,
    handle: blog.handle,
    articles: (blog.articles && blog.articles.edges ? blog.articles.edges : []).map(function (e) { return e.node; })
  };
}

export async function getBlogPostByHandle(blogHandle, articleHandle) {
  const q =
    "query ($blogHandle: String!, $articleHandle: String!) {" +
    "  blog(handle:$blogHandle) {" +
    "    articleByHandle(handle:$articleHandle) {" +
    "      id title handle excerpt excerptHtml contentHtml publishedAt updatedAt" +
    "      image { url altText } seo { title description } authorV2 { name } tags" +
    "    }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { blogHandle: blogHandle, articleHandle: articleHandle });
  return d.blog && d.blog.articleByHandle ? d.blog.articleByHandle : null;
}

export async function getPages(first) {
  const q =
    "query ($first: Int!) {" +
    "  pages(first:$first, sortKey:UPDATED_AT, reverse:true) {" +
    "    edges { node { id title handle body bodySummary createdAt updatedAt url seo { title description } } }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { first: first || 24 });
  return (d.pages && d.pages.edges ? d.pages.edges : []).map(function (e) { return e.node; });
}

export async function getPageByHandle(handle) {
  const q =
    "query ($handle: String!) {" +
    "  page(handle:$handle) {" +
    "    id title handle body bodySummary createdAt updatedAt url seo { title description }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { handle: handle });
  return d.page || null;
}

export async function getShopInfo() {
  const q =
    "query { shop { id name description primaryDomain { url host } currencyCode moneyFormat paymentSettings { acceptedCardBrands countryCode currencyCode enabledPresentmentCurrencies supportedDigitalWallets } shipsToCountries } }";
  const d = await fetchShopifyGraphQL(q);
  return d.shop || null;
}

export async function searchProducts(query, first, sortKey) {
  const q =
    "query ($query: String!, $first: Int!, $sortKey: SearchSortKeys!) {" +
    "  search(query:$query, first:$first, types:PRODUCT, sortKey:$sortKey) {" +
    "    edges { node { ... on Product {" +
    "      id handle title featuredImage { url altText }" +
    "      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "      seo { title description } tags productType vendor availableForSale totalInventory" +
    "    } } }" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, {
    query: query,
    first: first || 24,
    sortKey: sortKey || "RELEVANCE"
  });
  return (d.search && d.search.edges ? d.search.edges : []).map(function (e) { return e.node; });
}

export async function getProductRecommendations(productId, first) {
  const q =
    "query ($productId: ID!, $first: Int!) {" +
    "  productRecommendations(productId:$productId) {" +
    "    id handle title featuredImage { url altText }" +
    "    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }" +
    "    availableForSale" +
    "  }" +
    "}";
  const d = await fetchShopifyGraphQL(q, { productId: productId, first: first || 10 });
  return d.productRecommendations || [];
}