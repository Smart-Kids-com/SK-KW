// app/layout.js (Root Layout - Server Component)

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { Suspense } from 'react';

// ===== Site chrome =====
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ===== Cart drawer (context + drawer) =====
import { CartDrawerProvider } from '@/lib/CartDrawerContext';
import CartDrawer from '@/components/CartDrawer';

export const metadata = {
  title: 'Smart Kids KW',
  description:
    'متجر تعليم وترفيه للأطفال في الكويت - ألعاب تعليمية، قصص تفاعلية، وأدوات تنمية مهارات الأطفال.',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#370e3e', color: '#fff' }}>
        <CartDrawerProvider>
          <Suspense fallback={null}>
            <Header />
          </Suspense>

          <Suspense fallback={null}>
            {children}
          </Suspense>

          <Suspense fallback={null}>
            <Footer />
          </Suspense>

          <Suspense fallback={null}>
            <CartDrawer />
          </Suspense>
        </CartDrawerProvider>
      </body>
    </html>
  );
}
