"use client";
import React from "react";
import styles from "@/styles/cart.module.css";

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

export default function CartSummary({ total = 0, currency = "KWD", onCheckout, onClear }) {
  return (
    <footer className={styles.summary}>
      <div className={styles.total}>
        <span>الإجمالي</span>
        <strong>{money(total, currency)}</strong>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.clear} onClick={onClear} aria-label="تفريغ السلة">
          تفريغ السلة
        </button>
        <button type="button" className={styles.checkout} onClick={onCheckout} aria-label="الذهاب للدفع">
          الذهاب للدفع
        </button>
      </div>

      <p className={styles.smallNote}>سيتم تطبيق الخصومات والشحن في صفحة الدفع</p>
    </footer>
  );
}
