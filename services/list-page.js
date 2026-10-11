'use strict';
async function listPage(db, table, where, args, query, order, limit, offset) {
  if (offset > 10000) { const error=new Error('استخدم cursor للصفحات البعيدة');error.status=400;throw error; }
  const clauses=[...where], parameters=[...args];
  if (query.cursor !== undefined) {
    const cursor=Number(query.cursor);
    if(!Number.isSafeInteger(cursor)||cursor<1){const error=new Error('cursor غير صالح');error.status=400;throw error;}
    clauses.push(`id ${order==='DESC'?'<':'>'} ?`);parameters.push(cursor);
    offset=0;
  }
  const columns=table==='products'?'id,product_name,slug,sku,price,sale_price,image_url,stock,status,product_type,vendor,category,tags,seo_title,seo_description,created_at,updated_at':'*';
  const rows=await db.all(`SELECT ${columns} FROM ${table}${clauses.length?' WHERE '+clauses.join(' AND '):''}
    ORDER BY id ${order} LIMIT ? OFFSET ?`,[...parameters,limit+1,offset]);
  return {rows:rows.slice(0,limit),hasMore:rows.length>limit};
}
module.exports={listPage};
