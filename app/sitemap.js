// app/sitemap.js 
import { getCollections, getProducts } from '@/lib/shopify';

export default async function sitemap() {
  const baseUrl = 'https://smartkidskw.com';

  const staticPages = [
    { url: baseUrl,                         lastModified: new Date(), changeFrequency: 'daily',  priority: 1   },
    { url: `${baseUrl}/collections`,        lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
    { url: `${baseUrl}/about`,              lastModified: new Date(), changeFrequency: 'monthly',priority: 0.5 },
    { url: `${baseUrl}/contact`,            lastModified: new Date(), changeFrequency: 'monthly',priority: 0.5 },
    { url: `${baseUrl}/policies/privacy-policy`,  lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policies/terms-of-service`,lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policies/shipping-policy`, lastModified: new Date(), changeFrequency: 'monthly',priority: 0.4 },
    { url: `${baseUrl}/policies/refund-policy`,   lastModified: new Date(), changeFrequency: 'monthly',priority: 0.4 },
  ];

  const [collections, products] = await Promise.all([
    getCollections(100),
    getProducts(100),
  ]);

  const collectionPages = (collections || []).map((c) => ({
    url: `${baseUrl}/collections/${encodeURIComponent(c.handle)}`,
    lastModified: new Date(c.updatedAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productPages = (products || []).map((p) => ({
    url: `${baseUrl}/products/${encodeURIComponent(p.handle)}`,
    lastModified: new Date(p.updatedAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...collectionPages, ...productPages];
}
