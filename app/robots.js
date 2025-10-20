// app/robots.js أو ./robots.js (حسب هيكل مشروعك)
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/admin/', '/api/', '/checkout/'],
    },
    sitemap: 'https://smartkidskw.com/sitemap.xml',
  };
}
