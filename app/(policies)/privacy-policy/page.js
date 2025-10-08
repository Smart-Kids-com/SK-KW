// app/(policies)/privacy-policy/page.js
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPolicyHTMLByHandle } from '@/lib/policyByHandle';

export const dynamic = 'force-dynamic';

export default async function PolicyPage() { 
  const data = await getPolicyHTMLByHandle('privacy-policy');
  if (!data) notFound();
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem', direction: 'rtl', fontFamily: "'Amiri', serif" }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/policies" style={{ color: '#9422af', textDecoration: 'none' }}>← رجوع</Link>
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{data.title}</h1>
      <article style={{ background:'#fff', border:'1px solid #eee', borderRadius:12, padding:'1.25rem 1.5rem', lineHeight:1.9 }}
        dangerouslySetInnerHTML={{ __html: data.body }} />
    </main>
  );
}
