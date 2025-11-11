"use client";
import React from "react";
import styles from "@/styles/cart.module.css";

export default function QuantityStepper({ value = 1, min = 0, max = 999, onChange }) {
  const handleMinus = () => {
    const next = Math.max(min, (parseInt(value, 10) || 0) - 1);
    onChange?.(next);
  };
  const handlePlus = () => {
    const next = Math.min(max, (parseInt(value, 10) || 0) + 1);
    onChange?.(next);
  };

  return (
    <div className={styles.stepper} role="group" aria-label="تغيير الكمية">
      <button type="button" onClick={handleMinus} aria-label="إنقاص الكمية">−</button>
      <div className={styles.stepperValue} aria-live="polite">{value}</div>
      <button type="button" onClick={handlePlus} aria-label="زيادة الكمية">+</button>
    </div>
  );
}
