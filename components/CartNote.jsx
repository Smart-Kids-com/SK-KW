"use client";
import React, { useRef, useState } from "react";
import styles from "@/styles/cart.module.css";

export default function CartNote({ defaultValue = "", onSave, className = "" }) {
  const [note, setNote] = useState(defaultValue || "");
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  const onInput = (e) => {
    const v = e.target.value;
    setNote(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave?.(v);
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <div className={`${styles.noteBox} ${className}`}>
      <label className={styles.noteLabel}>إضافة ملاحظة</label>
      <textarea
        className={styles.noteArea}
        placeholder="اكتب ملاحظة للبائع (اختياري)"
        defaultValue={note}
        onInput={onInput}
        dir="rtl"
      />
      <div className={styles.noteHint}>{saving ? "جارٍ الحفظ…" : "سيتم حفظ الملاحظة تلقائياً"}</div>
    </div>
  );
}
