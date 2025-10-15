import OverlayChrome from '@/components/OverlayChrome';
import homepagedata from '@/lib/homepageData';
import Header from '@/components/Header';
import '@/styles/globals.css';
import HomepageSlideshow from '@/components/HomepageSlideshow';
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
      <OverlayChrome />
      <Header />

      <main>{children}</main>
      <HomepageSlideshow slides={homepagedata.slides} />
    </div>
  );
}