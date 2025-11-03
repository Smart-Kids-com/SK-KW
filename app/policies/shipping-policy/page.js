// app/policies/shipping-policy/page.js
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPolicyByHandle,
  getPolicyByHandleShopify,
} from "@/lib/policyByHandle";

export const dynamic = "force-dynamic";

export default async function ShippingPolicyPage() {
  // فعِّل السحب المباشر من شوبيفاي بوضع USE_SHOPIFY_POLICIES=1
  const useShopify = process.env.USE_SHOPIFY_POLICIES === "1";

  const data = useShopify
    ? await getPolicyByHandleShopify("shipping-policy")
    : getPolicyByHandle("shipping-policy");

  if (!data) notFound();

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "2rem 1rem",
        direction: "rtl",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/policies">← رجوع</Link>
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{data.title}</h1>
      <article
        style={{ lineHeight: 1.9 }}
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
    </main>
  );
}
