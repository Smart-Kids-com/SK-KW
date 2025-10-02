// app/products/[handle]/page.js
import Link from "next/link";

async function fetchProduct(handle) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
  const endpoint = `https://${domain}/api/2024-07/graphql.json`;
  const query = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id title description handle
        images(first: 6) { edges { node { url altText } } }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  `;
  const res = await fetch(endpoint, {
    method:"POST",
    headers:{
      "X-Shopify-Storefront-Access-Token": token,
      "Content-Type":"application/json",
    },
    body: JSON.stringify({ query, variables:{ handle } }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.productByHandle || null;
}

export default async function ProductPage({ params }) {
  const product = await fetchProduct(params.handle);
  if (!product) {
    return (
      <section style={{maxWidth:1000, margin:"2rem auto", padding:"0 16px"}}>
        <h1>لم يتم العثور على المنتج</h1>
        <Link href="/" style={{color:"#4f46e5", fontWeight:700}}>العودة للرئيسية</Link>
      </section>
    );
  }
  const imgs = product.images?.edges?.map(e => e.node) || [];
  const price = product.priceRange?.minVariantPrice;
  const priceText = price ? `${Number(price.amount).toFixed(3)} ${price.currencyCode}` : "";

  return (
    <section style={{maxWidth:1100, margin:"2rem auto", padding:"0 16px"}} dir="rtl">
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:24}}>
        <div>
          {imgs[0] && (
            <img src={imgs[0].url} alt={imgs[0].altText || product.title} style={{width:"100%", borderRadius:16}} />
          )}
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:8}}>
            {imgs.slice(1).map((im, i) => (
              <img key={i} src={im.url} alt={im.altText || product.title} style={{width:"100%", borderRadius:8}} />
            ))}
          </div>
        </div>
        <div>
          <h1 style={{margin:"0 0 10px"}}>{product.title}</h1>
          {priceText && <div style={{color:"#ef4444", fontWeight:800, marginBottom:12}}>{priceText}</div>}
          <div style={{color:"#444", lineHeight:1.7, marginBottom:16, whiteSpace:"pre-line"}}>
            {product.description}
          </div>
          {/* زر مؤقت — اربطه لاحقًا بعربة التسوق */}
          <Link href={`/cart`} className="btn btn-primary">أضِف إلى العربة</Link>
        </div>
      </div>
      <div style={{marginTop:24}}>
        <Link href="/" style={{color:"#4f46e5", fontWeight:700}}>العودة للرئيسية</Link>
      </div>
    </section>
  );
}
