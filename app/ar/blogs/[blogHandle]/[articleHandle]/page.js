import { fetchShopifyGraphQL } from "@/lib/shopify";

export default async function Article({ params }) {
  const QUERY = /* GraphQL */ `
    query ArticleByHandles($language: LanguageCode!, $blogHandle: String!, $articleHandle: String!) @inContext(language: $language) {
      blog(handle: $blogHandle) {
        articleByHandle(handle: $articleHandle) {
          title contentHtml image { url altText } publishedAt authorV2 { name }
        }
      }
    }
  `;
  const data = await fetchShopifyGraphQL(QUERY, { language: "AR", blogHandle: params.blogHandle, articleHandle: params.articleHandle });
  const art = data?.blog?.articleByHandle;
  if (!art) return <main style={{padding:24, direction:"rtl"}}>غير موجود.</main>;
  return (
    <main style={{ padding:24, maxWidth:900, margin:"0 auto", direction:"rtl" }}>
      <h1>{art.title}</h1>
      {art.image?.url && <img src={art.image.url} alt={art.image.altText||art.title} style={{ width:"100%", maxHeight:420, objectFit:"cover", borderRadius:12, margin:"12px 0" }} />}
      <article dangerouslySetInnerHTML={{ __html: art.contentHtml }} />
    </main>
  );
}
