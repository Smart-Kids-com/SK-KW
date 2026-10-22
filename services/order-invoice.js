'use strict';
const {randomUUID,createHash}=require('node:crypto');
const {atomicBatch}=require('./order-inventory');
function invoiceVersion(order){
  const fields=['order_number','customer_name','customer_email','customer_phone','customer_address',
    'customer_city','customer_district','billing_mode','billing_address','created_at',
    'subtotal','shipping_cost','discount_amount','total'];
  const content=fields.map(key=>order[key]??null);
  if(order.discount_label)content.push(['discount_label',order.discount_label]);
  content.push((order.items||[]).map(item=>[item.product_name,item.quantity,item.price??item.product_price,item.subtotal])
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
async function sendOrderInvoice(db,order,sender){
  const version=invoiceVersion(order),token=randomUUID(),now=Date.now();
  // Legacy jobs lack a fingerprint: require review instead of guessing their content.
  const legacy=await db.get('SELECT state FROM order_invoice_jobs WHERE order_id=?',[order.id]);
  if(legacy && !(await db.get("SELECT version FROM order_invoice_versions WHERE order_id=? AND version='legacy-review'",[order.id]))){const error=new Error('سجل الفاتورة القديم يحتاج مراجعة لتحديد النسخة المرسلة');error.status=409;throw error;}
  // An abandoned send outside the provider's safe retry window needs review.
  // Claiming it again could deliver the same invoice twice.
  await db.run("UPDATE order_invoice_versions SET state='uncertain',updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND version=? AND state='sending' AND retry_until<=?",[order.id,version,now]);
  await db.run(`INSERT INTO order_invoice_versions(order_id,version,state,lease_token,lease_until,retry_until) VALUES(?,?,'sending',?,?,?)
    ON CONFLICT(order_id,version) DO UPDATE SET state='sending',lease_token=excluded.lease_token,lease_until=excluded.lease_until,
    updated_at=CURRENT_TIMESTAMP WHERE order_invoice_versions.state='failed' OR
    (order_invoice_versions.state='sending' AND order_invoice_versions.lease_until<? AND order_invoice_versions.retry_until>?)`,[order.id,version,token,now+120000,now+23*60*60*1000,now,now]);
  const job=await db.get('SELECT * FROM order_invoice_versions WHERE order_id=? AND version=?',[order.id,version]);
  if(job.state==='sent')return {replayed:true};
  if(job.state==='uncertain'){
    const error=new Error('نتيجة إرسال الفاتورة غير مؤكدة؛ راجع سجل مزوّد البريد قبل أي إعادة إرسال');
    error.status=409;throw error;
  }
  if(job.lease_token!==token){const error=new Error('إرسال الفاتورة قيد التنفيذ');error.status=409;throw error;}
  let accepted=false;
  try{
    const receipt=await sender({order,idempotencyKey:`order-invoice-${order.id}-${version}`});
    if(!receipt?.id)throw new Error('Invoice was not accepted');
    accepted=true;
    await atomicBatch(db,[{sql:"UPDATE order_invoice_versions SET state='sent',provider_id=?,sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND version=? AND lease_token=?",args:[receipt.id,order.id,version,token]},
      {sql:"UPDATE orders SET invoice_sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM order_invoice_versions WHERE order_id=? AND version=? AND state='sent')",args:[order.id,order.id,version]}]);
    return {replayed:false};
  }catch(error){
    await db.run("UPDATE order_invoice_versions SET state=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND version=? AND lease_token=?",[accepted||error.deliveryUnknown?'uncertain':'failed',order.id,version,token]);
    const failure=new Error('تعذر إرسال الفاتورة؛ لم تُسجل كمرسلة');failure.status=502;throw failure;
  }
}
async function invoiceStatus(db,order){
  const version=invoiceVersion(order);
  const legacy=await db.get('SELECT state FROM order_invoice_jobs WHERE order_id=?',[order.id]);
  const reviewed=await db.get("SELECT version FROM order_invoice_versions WHERE order_id=? AND version='legacy-review'",[order.id]);
  const job=await db.get('SELECT state FROM order_invoice_versions WHERE order_id=? AND version=?',[order.id,version]);
  return {version,state:legacy&&!reviewed?'legacy_review':job?.state||'not_sent'};
}
async function reviewLegacyInvoice(db,order,version,decision){
  if(version!==invoiceVersion(order)){const error=new Error('تغيّر الطلب؛ حدّث الصفحة ثم راجع الفاتورة');error.status=409;throw error;}
  const status=await invoiceStatus(db,order);
  if(status.state!=='legacy_review')return;
  const statements=[{sql:"INSERT OR IGNORE INTO order_invoice_versions(order_id,version,state) VALUES(?,'legacy-review',?)",args:[order.id,decision]}];
  if(decision==='already_sent')statements.unshift({sql:"INSERT OR IGNORE INTO order_invoice_versions(order_id,version,state) VALUES(?,?,'sent')",args:[order.id,version]});
  await atomicBatch(db,statements);
}
module.exports={sendOrderInvoice,invoiceVersion,invoiceStatus,reviewLegacyInvoice};
