// app/layout.js
import '@/styles/globals.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { CartDrawerProvider } from '@/lib/CartDrawerContext';

import { Suspense } from 'react';

export const metadata = {
  title: 'Smart Kids Kuwait BookStore - متجر الأطفال المبتكرون الكويت',
  description:
    'متجر تعليم وترفيه للأطفال في الكويت - ألعاب تعليمية، قصص تفاعلية، وأدوات تنمية مهارات الأطفال.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#370e3e', color: '#fff' }}>
        <CartDrawerProvider>
          {/* مهم: لا تجعل الفول باك null حتى لا يختفي <header> في SSR */}
          <Suspense fallback={<header />}>
            <Header />
          </Suspense>

          <main>{children}</main>

          <Suspense fallback={<footer />}>
            <Footer />
          </Suspense>

          <CartDrawer />
        </CartDrawerProvider>
      </body>
    </html>
  );
}
