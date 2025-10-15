// app/layout.js (Root Layout - Server Component)

import homepageData from '@/lib/homepageData';

export const metadata = {
  title: 'Smart Kids KW',
  description: 'متجر تعليم وترفيه للأطفال',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
