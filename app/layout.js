// app/layout.js
import "./globals.css";
import { theme, themeVarsAsCss } from "@/lib/theme";

export const metadata = {
  title: "Smart Kids Kuwait",
  description: "متجر الأطفال المبتكرون - الكويت",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeVarsAsCss(theme) }} />
        {children}
      </body>
  </html>
);
}