import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CartDrawerProvider } from '../lib/CartDrawerContext';
import CartDrawer from '../components/CartDrawer';

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CartDrawerProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartDrawerProvider>
      </body>
    </html>
  );
}