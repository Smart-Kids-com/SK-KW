import HomeSlider from '@/components/HomeSlider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
/**
 * Layout component that wraps its children with a div and includes OverlayChrome.
 *
 * @param {Object} props - The props object.
 * @param {React.ReactNode} props.children - The content to be rendered inside the layout.
 * @returns {JSX.Element} The rendered layout component.
 */
export default function Layout({ children }) {
  return (
    <div>
      <Header />
      <HomeSlider />
      <main>{children}</main>
      <Footer />
    </div>
  );
}