// app/(policies)/contact-information/page.js
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicyByHandle } from "../../../lib/policyByHandle";

export const dynamic = "force-dynamic";

export default function PolicyPage() {
  const data = getPolicyByHandle("contact-information");
  if (!data) notFound();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", direction: "rtl" }}>
      <div style={{ marginBottom: "1rem" }}><Link href="/policies">← رجوع</Link></div>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{data.title}</h1>
      <article style={{ lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: data.content }} />
    </main>
  );
}
