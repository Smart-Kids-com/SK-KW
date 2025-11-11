// app/products/[handle]/page.js
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getProductByHandle, searchProducts, formatKWD } from '@/lib/shopify';
import AddToCartButton from '@/components/AddToCartButton';
import dynamic from 'next/dynamic';

const ProductGallery = dynamic(() => import('../../../components/ProductGallery'), { ssr: false });

export default async function ProductPage({ params }) {
  const rawHandle = decodeURIComponent(params.handle || '').trim();
  let product = await getProductByHandle(rawHandle);

  if (!product && /[^\u0000-\u007F]/.test(rawHandle)) {
    const hits = await searchProducts(rawHandle.replace(/[-_]+/g, ' '), 5, 'RELEVANCE');
    const best = Array.isArray(hits) ? hits.find(Boolean) : null;
    if (best?.handle) redirect(`/products/${encodeURIComponent(best.handle)}`);
  }
  if (!product) return notFound();

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] || null;

  return (
    <main style={{ direction: 'rtl', background:'#f8f9fa', minHeight:'100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        <nav style={{ fontSize: 12, marginBottom: 8, color:'#781659ff' }}>
          <Link href="/" style={{ color:'#7c3aed' }}>الرئيسية</Link> ← <span>{product.title}</span>
        </nav>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>
          <section>
            <ProductGallery images={product.images?.length ? product.images : [product.featuredImage].filter(Boolean)} />
          </section>
          <section style={{ background:'#fff', borderRadius:16, padding:16, boxShadow:'0 6px 20px rgba(0,0,0,.06)' }}>
            <h1 style={{ marginTop:0 }}>{product.title}</h1>
            <div style={{ fontSize:22, fontWeight:800, color:'#7c3aed' }}>
              {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
            </div>

            <div style={{ height:12 }} />

            {firstVariant?.id && product.availableForSale ? (
              <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr' }}>
                <AddToCartButton variantId={firstVariant.id}>أضف إلى السلة</AddToCartButton>
                <AddToCartButton variantId={firstVariant.id} goToCheckout>اشتري الآن</AddToCartButton>
              </div>
            ) : (
              <button disabled style={{ width:'100%', padding:'12px 16px', borderRadius:12, background:'#e5e7eb' }}>غير متوفر</button>
            )}

            {product.descriptionHtml && (
              <div style={{ marginTop:16, color:'#374151', lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
