"use client";
import { useEffect, useState } from "react";

/**
 * props:
 * - value?: number (initial / controlled-like)
 * - min?: number (default 1)
 * - max?: number (default 99)
 * - onChange?: (nextQty: number) => void
 * - id?: string
 * - disabled?: boolean
 * - className?: string
 * - style?: React.CSSProperties
 */
export default function QuantityInput({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  id,
  disabled = false,
  className,
  style,
}) {
  // داخليًا بنحتفظ بالحالة، وبنزامنها مع prop:value لو اتغيّرت من الأب
  const clamp = (n) => Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);
  const [qty, setQty] = useState(clamp(value));

  useEffect(() => {
    const next = clamp(value);
    if (next !== qty) setQty(next);
    // ما بنناديش onChange هنا عشان ما نعملش لوب مع الأب — الأب هو مصدر الحقيقة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max]);

  const emit = (next) => {
    setQty(next);
    if (onChange) onChange(next);
  };

  const inc = () => {
    if (disabled) return;
    if (qty < max) emit(qty + 1);
  };

  const dec = () => {
    if (disabled) return;
    if (qty > min) emit(qty - 1);
  };

  const handleInput = (e) => {
    if (disabled) return;
    // نحاول نقرأ رقم فقط
    const raw = e.target.value;
    const parsed = parseInt(raw, 10);
    const next = clamp(Number.isFinite(parsed) ? parsed : min);
    setQty(next); // نحدّث محليًا فورًا
  };

  const handleBlur = () => {
    // عند فقدان الفوكس نعمل clamp ونبلّغ الأب
    const next = clamp(qty);
    emit(next);
  };

  const handleKeyDown = (e) => {
    // منع رموز غير رقمية/الزيادات غير المنطقية
    const block = ["e", "E", "+", "-", "."];
    if (block.includes(e.key)) e.preventDefault();
  };

  const handleWheel = (e) => {
    // منع تغيير القيمة بعجلة الماوس أثناء الفوكس
    e.currentTarget.blur();
  };

  const atMin = qty <= min;
  const atMax = qty >= max;

  return (
    <div
      dir="rtl"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        margin: "1rem 0",
        ...style,
      }}
      aria-disabled={disabled}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || atMin}
        aria-label="إنقاص الكمية"
        title="إنقاص الكمية"
        style={{
          background: disabled || atMin ? "#eee" : "#f3f4f6",
          border: "none",
          borderRadius: 6,
          width: 32,
          height: 32,
          fontWeight: 700,
          fontSize: "1.2rem",
          cursor: disabled || atMin ? "not-allowed" : "pointer",
        }}
      >
        -
      </button>

      <input
        id={id}
        type="number"
        value={qty}
        min={min}
        max={max}
        step={1}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="الكمية"
        disabled={disabled}
        style={{
          width: 56,
          textAlign: "center",
          fontSize: "1.1rem",
          borderRadius: 6,
          border: "1px solid #ddd",
          padding: "4px 6px",
          background: disabled ? "#f9f9f9" : "#fff",
          color: "#111",
        }}
      />

      <button
        type="button"
        onClick={inc}
        disabled={disabled || atMax}
        aria-label="زيادة الكمية"
        title="زيادة الكمية"
        style={{
          background: disabled || atMax ? "#eee" : "#f3f4f6",
          border: "none",
          borderRadius: 6,
          width: 32,
          height: 32,
          fontWeight: 700,
          fontSize: "1.2rem",
          cursor: disabled || atMax ? "not-allowed" : "pointer",
        }}
      >
        +
      </button>
    </div>
  );
}
