// app/checkout/page.js
"use client";
import { useEffect, useState } from "react";

export default function CheckoutRedirect() {
  const [msg, setMsg] = useState("Redirecting to checkout…");

  useEffect(() => {
    (async () => {
      try {
        const cartId = localStorage.getItem("cartId");
        if (!cartId) {
          window.location.href = "/cart";
          return;
        }

        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", cartId }),
        });

        const data = await res.json();
        let url = data?.cart?.checkoutUrl;
        if (!url) {
          window.location.href = "/cart";
          return;
        }

        // Optional: pass through ?discount=CODE or ?locale=ar from the current URL
        const inParams = new URLSearchParams(window.location.search);
        if (inParams.size > 0) {
          const u = new URL(url);
          for (const [k, v] of inParams.entries()) u.searchParams.set(k, v);
          url = u.toString();
        }

        window.location.href = url;
      } catch {
        setMsg("Could not redirect. Go back to cart.");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>{msg}</h1>
      <p><a href="/cart">Back to cart</a></p>
    </main>
  );
}
