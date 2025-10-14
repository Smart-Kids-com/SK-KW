import OverlayChrome from "@/components/OverlayChrome";
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WhatsAppFloat from '../components/WhatsAppFloat';
import StructuredData from '../components/StructuredData';
import { GoogleAnalytics } from '../components/Analytics';
import { CartDrawerProvider } from '../lib/CartDrawerContext';
import CartDrawer from '../components/CartDrawer';

export const metadata = {
  title: {
    default: 'Smart Kids KW - ألعاب تعليمية وقصص تفاعلية للأطفال في الكويت',
    template: '%s | Smart Kids KW'
  },
  description: 'متجر Smart Kids الكويت - أفضل الألعاب التعليمية والقصص التفاعلية للأطفال. تسوق الآن واحصل على توصيل مجاني للطلبات أكثر من 20 د.ك',
  keywords: [
    'ألعاب تعليمية',
    'قصص أطفال',
    'ألعاب أطفال الكويت',
    'تعليم الأطفال',
    'قصص تفاعلية',
    'Smart Kids',
    'منتسوري',
    'تنمية مهارات الطفل',
    'ألعاب ذكية',
    'كتب أطفال'
  ],
  authors: [{ name: 'Smart Kids KW' }],
  creator: 'Smart Kids KW',
  publisher: 'Smart Kids KW',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://smartkidskw.com'),
  alternates: {
    canonical: '/',
    languages: {
      'ar-KW': '/',
      'ar': '/',
    },
  },
  openGraph: {
    title: 'Smart Kids KW - ألعاب تعليمية وقصص تفاعلية للأطفال',
    description: 'أفضل الألعاب التعليمية والقصص التفاعلية للأطفال في الكويت. توصيل مجاني للطلبات أكثر من 20 د.ك',
    url: 'https://smartkidskw.com',
    siteName: 'Smart Kids KW',
    images: [
      {
        url: '/images/smart-kids-logo-og.png',
        width: 1200,
        height: 630,
        alt: 'Smart Kids KW - ألعاب تعليمية للأطفال',
      }
    ],
    locale: 'ar_KW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Kids KW - ألعاب تعليمية للأطفال',
    description: 'أفضل الألعاب التعليمية والقصص التفاعلية للأطفال في الكويت',
    images: ['/images/smart-kids-logo-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#9422af',
      },
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#9422af',
    'theme-color': '#9422af',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Smart Kids KW',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <GoogleAnalytics GA_MEASUREMENT_ID="G-XXXXXXXXXX" />
        <StructuredData />
        <CartDrawerProvider>
          {/* ← طبقة التأثير العائمة على كل الصفحات */}
          <OverlayChrome />
          
          <Header />
          {/* مسافة علويّة/سفليّة بسيطة حتى لا يُغطّي الـ overlay المحتوى */}
          <main style={{ paddingTop: 'calc(56px + 12px)', paddingBottom: 'calc(64px + 16px)' }}>
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <WhatsAppFloat />
        </CartDrawerProvider>
      </body>
    </html>
  );
}
