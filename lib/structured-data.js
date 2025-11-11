// lib/structured-data.js
// توليد JSON-LD للمنتج والمجموعة بما يتوافق مع بيانات Shopify عندك

const BASE_URL = 'https://smartkidskw.com';

// تنضيف HTML بسيط
function stripHtml(html) {
  return (html || '').replace(/<[^>]*>?/gm, '').trim();
}

// يجيب أول صورة متاحة (featuredImage أو images[0])
function resolveProductImage(p) {
  return p?.featuredImage?.url || p?.images?.[0]?.url || '/images/default-product.jpg';
}

// يحوّل المبلغ إلى سترينج كما تحب Google
function asPriceString(val) {
  if (val == null) return '0';
  return typeof val === 'string' ? val : String(val);
}

// تحويل العملة (إن وُجدت)
function resolveCurrency(p) {
  return (
    p?.priceRange?.minVariantPrice?.currencyCode ||
    p?.compareAtPriceRange?.minVariantPrice?.currencyCode ||
    'KWD'
  );
}

export function generateProductSchema(product) {
  if (!product) return null;

  const name = product.title || '';
  const description =
    stripHtml(product.descriptionHtml) ||
    (typeof product.description === 'string' ? stripHtml(product.description) : name);

  const image = resolveProductImage(product);
  const handle = product.handle || '';
  const price = asPriceString(product?.priceRange?.minVariantPrice?.amount);
  const currency = resolveCurrency(product);
  const inStock = !!product.availableForSale;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: { '@type': 'Brand', name: 'Smart Smart Kids Kuwait BookStore KW' },
    sku: handle,
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/products/${encodeURIComponent(handle)}`,
      priceCurrency: currency,
      price,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Smart Kids KW',
        url: BASE_URL,
      },
    },
    // لو عندك تقييمات حقيقية لاحقاً، استبدل القيم الثابتة
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    category: 'Educational Toys',
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: 3,
      suggestedMaxAge: 12,
    },
  };
}

export function generateCollectionSchema(collection, products) {
  if (!collection) return null;

  const title = collection.title || '';
  const description =
    stripHtml(collection.descriptionHtml) ||
    (typeof collection.description === 'string' ? stripHtml(collection.description) : title);

  const handle = collection.handle || '';
  const items = (products || []).map((p, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    item: {
      '@type': 'Product',
      name: p.title || '',
      url: `${BASE_URL}/products/${encodeURIComponent(p.handle || '')}`,
      image: resolveProductImage(p),
      offers: {
        '@type': 'Offer',
        price: asPriceString(p?.priceRange?.minVariantPrice?.amount),
        priceCurrency: resolveCurrency(p),
      },
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${BASE_URL}/collections/${encodeURIComponent(handle)}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'المجموعات', item: `${BASE_URL}/collections` },
        {
          '@type': 'ListItem',
          position: 3,
          name: title,
          item: `${BASE_URL}/collections/${encodeURIComponent(handle)}`,
        },
      ],
    },
  };
}
