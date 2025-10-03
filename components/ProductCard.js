"use client";
import Link from "next/link";

export default function ProductCard({ product }) {
  if (!product) return null;

  const href = `/products/${encodeURIComponent(product.handle || "")}`;
  const imgSrc = product.imageUrl || "/placeholder-product.jpg";
  const imgAlt = product.imageAlt || product.title || "product";

  return (
    <Link href={href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="thumb">
        <img src={imgSrc} alt={imgAlt} />
      </div>
      <div className="info">
        <h3
          className="title"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.title || ""}
        </h3>
        {product.price ? <div className="price">{product.price}</div> : null}
        <span className="btn btn-primary">تفاصيل المنتج</span>
      </div>
    </Link>
  );
}
