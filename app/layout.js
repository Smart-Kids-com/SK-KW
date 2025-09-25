import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import shopifyHomeTemplate from '../index.js'; // <-- Add this line

console.log(shopifyHomeTemplate); // <-- Optional: log the template

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}