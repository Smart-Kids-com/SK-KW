// app/page.js  (Server Component)

import Link from "next/link";
import { getProducts, formatKWD } from "@/lib/shopify";
import HomeSlider from "@/components/HomeSlider";
import ProductCard from "@/components/ProductCard";
import { slidesPrimary, slidesSecondary } from "@/lib/homepageData";

export const revalidate = 300; // اختياري: كاش خفيف كل 5 دقايق

export default async function HomePage() {
  // هات منتجات الصفحة الرئيسية (عدّل العدد/الفلاتر حسب ما عندك في getProducts)
  const products = await getProducts({ first: 12 });

  return (
    <main>
      {/* السلايدر الأول */}
      <HomeSlider slides={slidesPrimary} />
  
      {/* شبكة المنتجات */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-8">
        {products?.map((p) => {
          const handle = p?.handle || "";
          const img =
            p?.images?.edges?.[0]?.node?.url ||
            p?.featuredImage?.url ||
            "";
          const title = p?.title || "";
          const amount =
            p?.priceRange?.minVariantPrice?.amount ??
            p?.variants?.edges?.[0]?.node?.price?.amount ??
            null;
  
          return (
            <Link href={`/products/${handle}`} key={p.id}>
              <ProductCard
                title={title}
                image={img}
                price={amount != null ? formatKWD(amount) : ""}
              />
            </Link>
          );
        })}
      </section>
  
      {/* السلايدر الثاني (اختياري) */}
      <HomeSlider slides={slidesSecondary} variant="secondary" />
    </main>
  );
}