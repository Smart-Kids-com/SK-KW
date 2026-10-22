'use strict';
const normalizeCode=v=>String(v??'').trim().toUpperCase();
const fail=message=>{const e=new Error(message);e.status=400;throw e};
const status=(d,now=Date.now())=>Number(d.archived)?'archived':!Number(d.is_active)?'draft':d.starts_at&&Date.parse(d.starts_at)>now?'scheduled':d.expires_at&&Date.parse(d.expires_at)<=now?'expired':'active';
function rules(d){try{return JSON.parse(d.rules_json||'{}')}catch{fail('Invalid discount configuration')}}
function date(value){if(!value)return null;const text=String(value);const d=new Date(/(Z|[+-]\d\d:\d\d)$/i.test(text)?text:text+'+03:00');if(!Number.isFinite(d.getTime()))fail('Invalid Kuwait date/time');return d.toISOString()}
function normalize(body,current={}){
 if(body.customer_ids?.length||body.per_customer_limit)fail('Customer restrictions require a verified customer identity, unavailable in guest checkout');
 const d={...current,...body};
 const integer=(v,label,nullable=false)=>{if(nullable&&(v==null||v===''))return null;const n=Number(v||0);if(!Number.isSafeInteger(n)||n<0)fail('Invalid '+label);return n};
 const number=(v,label)=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0||n>1e9)fail('Invalid '+label);return n};
 const method=d.method||'code',type=d.type||'fixed';if(!['code','automatic'].includes(method)||!['fixed','percentage','free_shipping'].includes(type))fail('Invalid discount method or type');
 const code=normalizeCode(d.code);if(!code||code.length>80||/[\x00-\x1f]/.test(code))fail('A unique code / internal identifier is required');
 const value=type==='free_shipping'?0:number(d.value,'value');if(type!=='free_shipping'&&value<=0||type==='percentage'&&value>100)fail('Value must be positive; percentage cannot exceed 100');
 const r=body.rules===undefined?rules(d):body.rules;if(!r||typeof r!=='object'||Array.isArray(r))fail('Invalid rules');
 if(r.customer_ids?.length||r.per_customer_limit)fail('Customer restrictions require a verified customer identity, unavailable in guest checkout');
 const scope=r.scope||'order';if(!['order','products','collections'].includes(scope))fail('Invalid scope');
 if(r.ids!==undefined&&!Array.isArray(r.ids))fail('Invalid target IDs');
 const ids=(r.ids||[]).map(Number);if(ids.length>500||ids.some(i=>!Number.isSafeInteger(i)||i<=0))fail('Invalid target IDs');if(scope!=='order'&&!ids.length)fail('Select at least one product or collection');
 const starts_at=date(d.starts_at),expires_at=date(d.expires_at);if(starts_at&&expires_at&&starts_at>=expires_at)fail('End must be after start');
 return {code,title:String(d.title||'').trim().slice(0,200),method,type,value,is_active:Number(d.is_active??1)?1:0,archived:Number(d.archived||0)?1:0,minimum_order_amount:number(d.minimum_order_amount,'minimum purchase'),usage_limit:integer(d.usage_limit,'usage limit',true),starts_at,expires_at,notes:String(d.notes||'').slice(0,2000),rules_json:JSON.stringify({scope,ids:[...new Set(ids)],minimum_quantity:integer(r.minimum_quantity,'minimum quantity')})};
}
async function calculate(db,items,subtotalFils,shippingFils,requestedCode){
 const code=normalizeCode(requestedCode),cols=await db.all('PRAGMA table_info(discount_codes)'),modern=cols.some(c=>c.name==='method');
 const candidates=code?[await db.get('SELECT * FROM discount_codes WHERE UPPER(TRIM(code))=?',[code])]:modern?await db.all("SELECT * FROM discount_codes WHERE method='automatic' AND is_active=1 AND archived=0 ORDER BY id"):[];
 let best=null;
 for(const d of candidates){try{
  if(!d||status(d)!=='active'||code&&d.method==='automatic')fail('الخصم غير صالح أو خارج فترة الصلاحية');
  if(d.starts_at&&!Number.isFinite(Date.parse(d.starts_at))||d.expires_at&&!Number.isFinite(Date.parse(d.expires_at)))fail('تاريخ الخصم غير صالح');
  if(d.usage_limit!=null&&Number(d.used_count||0)>=Number(d.usage_limit))fail('تم الوصول إلى حد الاستخدام');
  if(subtotalFils<Math.round(Number(d.minimum_order_amount||0)*1000))fail('الطلب أقل من الحد الأدنى للشراء');
  const r=rules(d);let eligible=items;
  if(r.scope==='products')eligible=items.filter(i=>(r.ids||[]).map(String).includes(String(i.product_id)));
  if(r.scope==='collections'){
   // Shared membership predicate includes smart collection rules and exclusions.
   const {rulePredicate}=require('./collections-editor');
   const ids=r.ids||[];const productIds=new Set();
   for(const id of ids){
    const c=await db.get('SELECT * FROM collections WHERE id=?',[id]);if(!c||c.deleted_at)continue;
    const modern=Object.hasOwn(c,'kind');
    const predicate=modern?`((c.kind='manual' AND EXISTS(SELECT 1 FROM collection_products cp WHERE cp.collection_id=c.id AND cp.product_id=p.id)) OR (c.kind='automated' AND ${rulePredicate()} AND NOT EXISTS(SELECT 1 FROM collection_exclusions ex WHERE ex.collection_id=c.id AND ex.product_id=p.id)))`:`EXISTS(SELECT 1 FROM collection_products cp WHERE cp.collection_id=c.id AND cp.product_id=p.id)`;
    for(const p of await db.all(`SELECT p.id FROM products p JOIN collections c ON c.id=? WHERE p.id IN(${items.map(()=>'?')}) AND ${predicate}`,[id,...items.map(i=>i.product_id)]))productIds.add(String(p.id));
   }
   eligible=items.filter(i=>productIds.has(String(i.product_id)));
  }
  const qty=eligible.reduce((s,i)=>s+i.quantity,0);if(!eligible.length||qty<Number(r.minimum_quantity||0))fail('المنتجات أو الكمية لا تطابق شروط الخصم');
  const eligibleFils=eligible.reduce((s,i)=>s+Math.round(i.price*1000)*i.quantity,0),value=Number(d.value);
  if(!Number.isFinite(value)||value<0||!['percentage','fixed','free_shipping'].includes(d.type))fail('إعدادات الخصم غير صالحة');
  const amount=d.type==='free_shipping'?shippingFils:Math.min(eligibleFils,d.type==='percentage'?Math.round(eligibleFils*Math.min(value,100)/100):Math.round(value*1000));
  if(!code&&amount<=0)continue;
  const candidate={discount:d,discountFils:amount};if(!best||amount>best.discountFils)best=candidate;
 }catch(e){if(code)throw e; if(!e.status)throw e;}}
 return best||{discount:null,discountFils:0};
}
module.exports={normalizeCode,status,rules,date,normalize,calculate};
