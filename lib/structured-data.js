export function generateProductSchema(product) {
  if (!product) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description || product.title,
    "image": product.images?.[0]?.url || "/images/default-product.jpg",
    "brand": {
      "@type": "Brand",
      "name": "Smart Kids KW"
    },
    "sku": product.handle,
    "offers": {
      "@type": "Offer",
      "url": `https://smartkidskw.com/products/${product.handle}`,
      "priceCurrency": "KWD",
      "price": product.priceRange?.minVariantPrice?.amount || "0",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": product.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Smart Kids KW",
        "url": "https://smartkidskw.com"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    },
    "category": "Educational Toys",
    "audience": {
      "@type": "PeopleAudience",
      "suggestedMinAge": 3,
      "suggestedMaxAge": 12
    }
  };

  return schema;
}

export function generateCollectionSchema(collection, products) {
  if (!collection) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": collection.title,
    "description": collection.description || collection.title,
    "url": `https://smartkidskw.com/collections/${collection.handle}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": products?.length || 0,
      "itemListElement": products?.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.title,
          "url": `https://smartkidskw.com/products/${product.handle}`,
          "image": product.images?.[0]?.url,
          "offers": {
            "@type": "Offer",
            "price": product.priceRange?.minVariantPrice?.amount,
            "priceCurrency": "KWD"
          }
        }
      })) || []
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "الرئيسية",
          "item": "https://smartkidskw.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "المجموعات",
          "item": "https://smartkidskw.com/collections"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": collection.title,
          "item": `https://smartkidskw.com/collections/${collection.handle}`
        }
      ]
    }
  };

  return schema;
}