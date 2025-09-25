import { getProductByHandle } from '../../../lib/shopify';
import ProductVariantSelector from '../../../components/ProductVariantSelector';
import QuantityInput from '../../../components/QuantityInput';
import AddToCartButton from '../../../components/AddToCartButton';
import { t } from '../../../lib/i18n';

export default async function ProductPage({ params }) {
  const locale = "ar";
  const product = await getProductByHandle(params.handle);

  if (!product) {
    return <div style={{ padding: 40, textAlign: 'center' }}>{t("products.product.not_found", locale) || "هذا المنتج غير موجود."}</div>;
  }

  const defaultVariant = product.variants?.[0];
  return (
    <section style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: 24 }}>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <img
            src={product.featuredImage?.src}
            alt={product.featuredImage?.alt || product.title}
            style={{ width: 340, height: 340, objectFit: 'cover', borderRadius: 12, background: '#eee' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'var(--color-primary)', marginBottom: 12 }}>{product.title}</h1>
          <div style={{ margin: '16px 0', fontSize: '1.2rem', color: '#333' }}>
            {Number(product.price).toLocaleString('ar-KW', { style: 'currency', currency: product.currency })}
          </div>
          <ProductVariantSelector variants={product.variants} />
          <QuantityInput value={1} min={1} max={10} />
          {product.availableForSale ? (
            <AddToCartButton product={product} variantId={defaultVariant?.id} quantity={1} />
          ) : (
            <div style={{ color: 'var(--color-error)', marginBottom: 18 }}>
              {t("products.product.sold_out", locale) || "نفذت الكمية"}
            </div>
          )}
          <div style={{ color: '#444', lineHeight: 1.7, marginTop: 18 }} dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }} />
        </div>
      </div>
    </section>
  );
}