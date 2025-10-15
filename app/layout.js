// app/layout.js
import "../styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import OverlayChrome from "@/components/OverlayChrome";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export const metadata = {
  title: "Smart Kids KW",
  description: "متجر تعليمي للأطفال",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Analytics />
        <OverlayChrome />
        <Header />
        {children}
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
