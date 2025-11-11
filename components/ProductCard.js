"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductCard({ product }) {
  if (!product) return null;

  const pathname = usePathname();
  const base = pathname?.startsWith("/ar") ? "/ar" : "";
  const handle = product.handle || "";
  const href = `${base}/products/${encodeURIComponent(handle)}`;

  const imgSrc =
    product?.featuredImage?.url ||
    (Array.isArray(product?.images) && product.images[0]?.url) ||
    product.imageUrl ||
    "/placeholder-product.jpg";

  const variantId = Array.isArray(product?.variants) ? product.variants[0]?.id : null;

  return (
    <div className="card" style={{ textDecoration: "none", color: "inherit" }}>
      <Link href={href}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "#f3f4f6", borderRadius: 16 }}>
          <img src={imgSrc} alt={product.title || "product"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </Link>

      <div className="info" style={{ marginTop: ".6rem" }}>
        <h3 style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.title || ""}
        </h3>

        <div style={{ marginTop: ".6rem" }}>
          {variantId ? (
            <AddToCartButton
              variantId={variantId}
              style={{
                width: "100%",
                padding: ".85rem 1rem",
                borderRadius: 14,
                border: "2px solid #e9d5ff",
                background: "transparent",
                color: "#e9d5ff",
                fontWeight: 700,
              }}
            >
              أضف إلى عربة التسوق
            </AddToCartButton>
          ) : (
            <Link
              href={href}
              style={{
                display: "inline-block",
                width: "100%",
                textAlign: "center",
                padding: ".85rem 1rem",
                borderRadius: 14,
                border: "2px solid #e9d5ff",
                color: "#e9d5ff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              تفاصيل المنتج
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}