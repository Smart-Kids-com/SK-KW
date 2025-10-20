// app/layout.js (Root Layout - Server Component)

// ===== Swiper global CSS =====
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// ===== Site chrome =====
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Smart Kids KW',
  description: 'متجر تعليم وترفيه للأطفال في الكويت - ألعاب تعليمية، قصص تفاعلية، وأدوات تنمية مهارات الأطفال.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#370e3e', color: '#fff' }}>
        <Header />
        {children}
        <Footer />
      </body>
  </html>
);
}