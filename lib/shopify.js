if(!process.env.SHOPIFY_STORE_DOMAIN){throw new Error('Missing SHOPIFY_STORE_DOMAIN in .env');}
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_API_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

// Generic fetcher
export async function fetchShopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/${process.env.SHOPIFY_API_VERSION || '2025-07'}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 }
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export async function getCollections() {
  const query = `
    {
      collections(first: 20) {
        edges {
          node {
            handle
            title
            description
            image { src }
          }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(query);
  return data.collections.edges.map(edge => edge.node);
}

export async function getCollectionByHandle(handle) {
  const query = `
    query ($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        description
        descriptionHtml
        image { src }
        products(first: 50) {
          edges {
            node {
              id
              handle
              title
              description
              featuredImage { src }
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
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(query, { handle });
  const collection = data.collectionByHandle;
  if (!collection) return null;

  return {
    ...collection,
    products: collection.products.edges.map(edge => ({
      ...edge.node,
      featuredImage: edge.node.featuredImage,
      price: edge.node.priceRange.minVariantPrice.amount,
      currency: edge.node.priceRange.minVariantPrice.currencyCode,
      variants: edge.node.variants.edges.map(e => e.node)
    }))
  };
}

export async function getProductByHandle(handle) {
  const query = `
    query ($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        description
        descriptionHtml
        featuredImage { src }
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
    price: product.priceRange.minVariantPrice.amount,
    currency: product.priceRange.minVariantPrice.currencyCode,
    variants: product.variants?.edges?.map(e => e.node) || []
  };
}