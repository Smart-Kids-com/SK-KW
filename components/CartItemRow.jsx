"use client";
import React from "react";
import styles from "@/styles/cart.module.css";
import QuantityStepper from "@/components/QuantityStepper";

function money(amount, currency = "KWD") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("ar-KW", {
      style: "currency",
      currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(isNaN(n) ? 0 : n);
  } catch {
    return `${n || 0} ${currency}`;
  }
}

export default function CartItemRow({ line, onChangeQty, onRemove }) {
  const id =
    line.id || line.merchandiseId || line.variantId || line.key || "";
  const q =
    line.quantity ?? line.qty ?? line.currentQuantity ?? 1;
  const merchandise = line.merchandise || line.variant || {};
  const product = merchandise.product || line.product || {};
  const image = merchandise.image || line.image || product.featuredImage || {};
  const title =
    line.title || product.title || merchandise.title || "منتج";
  const variantTitle = merchandise.title && merchandise.title !== "Default Title"
      ? merchandise.title
      : "";
  const priceAmount =
    line.cost?.totalAmount?.amount ||
    line.price?.amount ||
    line.final_line_price?.amount ||
    line.cost?.amount ||
    line.price ||
    0;
  const currency =
    line.cost?.totalAmount?.currencyCode ||
    line.price?.currencyCode ||
    line.final_line_price?.currency ||
    "KWD";

  const handleChange = (nextQty) => onChangeQty?.(id, nextQty);
  const handleRemove = () => onRemove?.(id);

  return (
    <article className={styles.row}>
      <div className={styles.rowMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image?.url || image?.src || "/placeholder.png"}
          alt={image?.altText || title}
        />
      </div>

      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>
          <div className={styles.name}>{title}</div>
          {variantTitle && <div className={styles.variant}>{variantTitle}</div>}
        </div>

        <div className={styles.rowFoot}>
          <QuantityStepper
            value={q}
            min={0}
            onChange={handleChange}
          />
          <button
            title="إزالة"
            aria-label="إزالة المنتج"
            className={styles.remove}
            onClick={handleRemove}
            type="button"
          >
            🗑️
          </button>
          <div className={styles.rowPrice}>{money(priceAmount, currency)}</div>
        </div>
      </div>
    </article>
  );
}
