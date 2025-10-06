// components/ContactForm.js
"use client";
import { useState } from "react";

export default function ContactForm({ locale = "en" }) {
  const [state, setState] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const rtl = locale === "ar";

  const t = locale === "ar"
    ? {
        title: "نموذج التواصل",
        name: "الاسم",
        email: "البريد الإلكتروني",
        subject: "الموضوع (اختياري)",
        message: "رسالتك",
        send: "إرسال",
        sent: "تم الإرسال! سنعود إليك قريبًا.",
        error: "تعذر الإرسال. حاول مرة أخرى.",
      }
    : {
        title: "Contact Form",
        name: "Name",
        email: "Email",
        subject: "Subject (optional)",
        message: "Your message",
        send: "Send",
        sent: "Sent! We’ll get back to you soon.",
        error: "Could not send. Please try again.",
      };

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, locale }),
      });
      if (!res.ok) throw new Error("fail");
      setState({ name: "", email: "", subject: "", message: "" });
      setDone(true);
    } catch {
      alert(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{
      marginTop: 24, display: "grid", gap: 12, maxWidth: 700,
      direction: rtl ? "rtl" : "ltr"
    }}>
      <h2 style={{ margin: "8px 0" }}>{t.title}</h2>

      <input
        required
        placeholder={t.name}
        value={state.name}
        onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      />
      <input
        required type="email"
        placeholder={t.email}
        value={state.email}
        onChange={(e) => setState(s => ({ ...s, email: e.target.value }))}
        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      />
      <input
        placeholder={t.subject}
        value={state.subject}
        onChange={(e) => setState(s => ({ ...s, subject: e.target.value }))}
        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      />
      <textarea
        required
        placeholder={t.message}
        value={state.message}
        onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}
        style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", minHeight: 140 }}
      />
      <button
        disabled={loading}
        style={{
          padding: "12px 18px", borderRadius: 12, border: "none",
          background: "#3d0856", color: "#fff", fontWeight: 700, cursor: "pointer"
        }}
      >
        {loading ? "…" : t.send}
      </button>

      {done && <div style={{ color: "#2e7d32", fontWeight: 600 }}>{t.sent}</div>}
    </form>
  );
}
