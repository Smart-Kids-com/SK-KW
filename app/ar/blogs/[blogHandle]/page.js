import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function BlogList({ params }) {
  const QUERY = /* GraphQL */ `
    query BlogByHandle($language: LanguageCode!, $handle: String!, $first: Int = 20) @inContext(language: $language) {
      blog(handle: $handle) {
        title handle
        articles(first: $first) {
          edges { node { handle title excerptHtml image { url altText } publishedAt } }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR", handle: params.handle, first: 20 });
  const blog = data?.blog;
  if (!blog) return <main style={{padding:24, direction:"rtl"}}>غير موجود.</main>;
  const items = blog.articles.edges.map(e => e.node);
  return (
    <main style={{ padding:24, maxWidth:1000, margin:"0 auto", direction:"rtl" }}>
      <h1>{blog.title}</h1>
      <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))" }}>
        {items.map(a => (
          <a key={a.handle} href={`/ar/blogs/${blog.handle}/${a.handle}`} style={{ textDecoration:"none", color:"inherit", border:"1px solid #eee", borderRadius:12, padding:12 }}>
            {a.image?.url && <img src={a.image.url} alt={a.image.altText||a.title} style={{ width:"100%", height:150, objectFit:"cover", borderRadius:8 }} />}
            <div style={{ fontWeight:600, marginTop:8 }}>{a.title}</div>
            {a.excerptHtml && <div dangerouslySetInnerHTML={{ __html: a.excerptHtml }} />}
          </a>
        ))}
      </div>
    </main>
  );
}
