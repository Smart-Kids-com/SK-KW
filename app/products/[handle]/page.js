// app/products/[handle]/page.js
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProductByHandle, searchProducts, formatKWD } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";
import WishlistButton from "@/components/WishlistButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const rawHandle = decodeURIComponent(params.handle || "").trim();

  // 1) جرّب الهاندل كما هو
  let product = await getProductByHandle(rawHandle);

  // 2) لو فشل وكان الهاندل غير ASCII (عربي)، اعمل بحث ثم Redirect للـhandle القانوني
  if (!product && /[^\u0000-\u007F]/.test(rawHandle)) {
    const queryText = rawHandle.replace(/[-_]+/g, " ");
    const hits = await searchProducts(queryText, 5, "RELEVANCE");
    const best = Array.isArray(hits) ? hits.find(Boolean) : null;
    if (best?.handle && best.handle !== rawHandle) {
      // حوّل للرابط القانوني فورًا (ده بيحل 404 للهاندلات العربية)
      redirect(`/products/${encodeURIComponent(best.handle)}`);
    }
  }

  if (!product) {
    notFound();
  }

  // ----- بقية الصفحة -----
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] || null;
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = product.featuredImage?.url || images?.[0]?.url || null;

  return (
    <main
      style={{
        direction: "rtl",
        fontFamily: "'Amiri', serif",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "1rem 2rem",
          fontSize: "0.9rem",
          color: "#718096",
        }}
      >
        <Link href="/" style={{ color: "#9422af", textDecoration: "none" }}>
          الرئيسية
        </Link>
        <span style={{ margin: "0 0.5rem" }}>←</span>
        <Link
          href="/collections"
          style={{ color: "#9422af", textDecoration: "none" }}
        >
          كل المجموعات
        </Link>
        <span style={{ margin: "0 0.5rem" }}>←</span>
        <span>{product.title}</span>
      </div>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(1rem, 3vw, 2rem)",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
          gap: "clamp(2rem, 5vw, 3rem)",
          alignItems: "start",
        }}
      >
        {/* Product Images */}
        <div style={{ position: "sticky", top: "2rem" }}>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", paddingBottom: "100%" }}>
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage}
                  alt={product.featuredImage?.altText || product.title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "4rem",
                  }}
                >
                  🎁
                </div>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(clamp(60px, 15vw, 80px), 1fr))",
                gap: "0.75rem",
              }}
            >
              {images.map((image, index) => (
                <div
                  key={image.url + index}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 12,
                    overflow: "hidden",
                    border:
                      mainImage === image.url
                        ? "2px solid #9422af"
                        : "2px solid transparent",
                  }}
                >
                  <div style={{ position: "relative", paddingBottom: "100%" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.altText || `${product.title} ${index + 1}`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: "clamp(1.5rem, 4vw, 2rem)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
                fontWeight: 700,
                color: "#2d3748",
                marginBottom: "1rem",
                lineHeight: "1.3",
              }}
            >
              {product.title}
            </h1>

            {/* Price */}
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2rem)",
                  fontWeight: 700,
                  color: "#9422af",
                  marginBottom: "0.5rem",
                }}
              >
                {formatKWD(product.priceRange?.minVariantPrice?.amount || 0)}
              </div>
              {product.compareAtPriceRange?.minVariantPrice?.amount && (
                <div
                  style={{
                    fontSize: "clamp(1.1rem, 3vw, 1.3rem)",
                    color: "#718096",
                    textDecoration: "line-through",
                  }}
                >
                  {formatKWD(
                    product.compareAtPriceRange.minVariantPrice.amount
                  )}
                </div>
              )}
            </div>

            {/* Availability */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: product.availableForSale
                  ? "#d4edda"
                  : "#f8d7da",
                borderRadius: 8,
                color: product.availableForSale ? "#155724" : "#721c24",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>
                {product.availableForSale ? "✅" : "❌"}
              </span>
              <span style={{ fontWeight: 600 }}>
                {product.availableForSale
                  ? "متوفر في المخزون"
                  : "نفذت الكمية — غير متوفر حالياً"}
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "2rem",
                flexWrap: "wrap",
              }}
            >
              {firstVariant?.id && product.availableForSale ? (
                <>
                  <AddToCartButton
                    variantId={firstVariant.id}
                    style={{
                      flex: 1,
                      minWidth: "min(200px, 100%)",
                      padding:
                        "clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)",
                      backgroundColor: "#9422af",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    🛒 أضف إلى السلة
                  </AddToCartButton>
                  <AddToCartButton
                    variantId={firstVariant.id}
                    goToCheckout
                    style={{
                      flex: 1,
                      minWidth: "min(200px, 100%)",
                      padding:
                        "clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)",
                      backgroundColor: "#e74c3c",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    ⚡ اشتري الآن
                  </AddToCartButton>
                </>
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "1rem 2rem",
                    backgroundColor: "#e2e8f0",
                    color: "#718096",
                    border: "none",
                    borderRadius: 12,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    cursor: "not-allowed",
                  }}
                >
                  غير متوفر حالياً
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center" }}>
                <WishlistButton productId={product.id} size="large" />
              </div>
            </div>
          </div>

          {/* Description */}
          {product.descriptionHtml && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: "2rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#2d3748",
                  marginBottom: "1.5rem",
                  borderBottom: "2px solid #9422af",
                  paddingBottom: "0.5rem",
                }}
              >
                📝 وصف المنتج
              </h2>
              <div
                style={{ lineHeight: "1.8", color: "#4a5568", fontSize: "1.1rem" }}
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
