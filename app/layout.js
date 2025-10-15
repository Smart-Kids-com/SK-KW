import OverlayChrome from '@/components/OverlayChrome';
import './globals.css';
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
      <main>{children}</main>
    </div>
  );
}