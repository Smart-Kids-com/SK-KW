/* Shared transport only; retains existing rendering and page design. */
window.fetchCatalogPages = async function (input, options = {}) {
  const url = new URL(input, location.href);
  if (url.origin !== location.origin || url.pathname !== '/api/products') {
    throw new Error('Catalog pagination requires the local products API');
  }
  url.searchParams.set('limit','100');url.searchParams.set('offset','0');
  const items=[],seen=new Set();
  for (;;) {
    const response=await fetch(url.pathname+url.search,{...options,signal:AbortSignal.timeout(25000)});
    const result=await response.json();
    if(!response.ok||!result.success||!Array.isArray(result.data))throw new Error(result.error||'تعذر تحميل المنتجات');
    for(const item of result.data)if(!seen.has(String(item.id))){seen.add(String(item.id));items.push(item);}
    if(!result.pagination?.hasMore)break;
    const cursor=result.pagination.cursor?.id;
    if(!cursor||String(cursor)===url.searchParams.get('cursor'))throw new Error('Catalog cursor did not advance');
    url.searchParams.set('cursor',cursor);
  }
  return {success:true,data:items};
};
