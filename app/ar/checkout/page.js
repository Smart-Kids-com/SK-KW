// app/ar/checkout/page.js
"use client";
import { useEffect, useState } from "react";

export default function CheckoutRedirectAR() {
  const [msg, setMsg] = useState("جاري التحويل إلى الدفع…");

  useEffect(() => {
    (async () => {
      try {
        const cartId = localStorage.getItem("cartId");
        if (!cartId) return (window.location.href = "/ar/cart");

        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", cartId }),
        });

        const data = await res.json();
        let url = data?.cart?.checkoutUrl;
        if (!url) return (window.location.href = "/ar/cart");

        // ثبّت اللغة العربية + مرّر أي بارامترات موجودة في الرابط الحالي (مثل discount)
        const outUrl = new URL(url);
        outUrl.searchParams.set("locale", "ar");
        const inParams = new URLSearchParams(window.location.search);
        for (const [k, v] of inParams.entries()) outUrl.searchParams.set(k, v);

        window.location.href = outUrl.toString();
      } catch {
        setMsg("تعذّر التحويل. ارجع إلى السلة.");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24, direction: "rtl" }}>
      <h1>{msg}</h1>
      <p><a href="/ar/cart">العودة للسلة</a></p>
    </main>
  );
}
