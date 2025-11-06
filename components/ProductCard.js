"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProductCard({ product }) {
  if (!product) return null;

  const pathname = usePathname();
  const base = pathname?.startsWith("/ar") ? "/ar" : "";
  const href = `${base}/products/${encodeURIComponent(product.handle || "")}`;
  const imgSrc = product.imageUrl || "/placeholder-product.jpg";
  const imgAlt = product.imageAlt || product.title || "product";

  return (
    <Link href={href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="thumb" style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#f3f4f6" }}>
        <img src={imgSrc} alt={imgAlt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div className="info">
        <h3 className="title" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.title || ""}
        </h3>
        {product.price ? <div className="price">{product.price}</div> : null}
        <span className="btn btn-primary">تفاصيل المنتج</span>
      </div>
    </Link>
  );
}
