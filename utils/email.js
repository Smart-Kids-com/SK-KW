const { Resend } = require('resend');
const presentation = require('../public/js/order-presentation');
const safeText=(value,fallback='')=>String(value??'').trim()||fallback;
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
const formatMoney=(n,currency)=>currency==='د.ك'?presentation.money(n):`${(Number(n)||0).toFixed(3)} ${currency||'KWD'}`;
function sender(value){const address=safeText(value).match(/<([^<>]+)>/)?.[1]||safeText(value);return `Smart Kids Kuwait <${address}>`;}
function phoneDigits(value){let n=String(value||'').replace(/\D/g,'');if(n.startsWith('00965'))n=n.slice(2);if(n.length===8)n='965'+n;return n;}
function buildItemsRows(items,currency){
  if(!Array.isArray(items)||!items.length)return '<tr><td colspan="3">—</td></tr>';
  return items.map(item=>{const name=escapeHtml(safeText(item.product_name,'منتج')),qty=Number(item.quantity)||1,price=Number(item.price??item.product_price)||0,image=presentation.image(item.product_image||item.image);return `<tr>
  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;word-break:normal;overflow-wrap:anywhere;line-height:1.7;" dir="auto">${image?`<img src="${escapeHtml(image)}" alt="" width="48" height="48" style="display:block;max-width:48px;object-fit:contain;margin-bottom:6px;border:0;">`:''}${name}</td>
  <td style="padding:12px 6px;width:40px;text-align:center;vertical-align:top;">${qty}</td>
  <td dir="auto" style="padding:12px 6px;width:102px;text-align:end;vertical-align:top;white-space:nowrap;">${escapeHtml(formatMoney(price*qty,currency))}</td></tr>`;}).join('');
}
function buildSummaryRows(order,currency,english=false){return [[english?'Subtotal':'المجموع الفرعي',order.subtotal],[english?'Shipping':'التوصيل',order.shipping_cost],...(Number(order.discount_amount)>0?[[(english?'Discount':'الخصم')+(order.discount_label||order.discount_code?' — '+escapeHtml(order.discount_label||order.discount_code):''),order.discount_amount]]:[]),[english?'Total':'الإجمالي',order.total]].map(([label,value])=>`<tr><td style="padding:9px 4px;">${label}</td><td style="padding:9px 4px;text-align:end;font-weight:700;" dir="auto">${escapeHtml(formatMoney(value,currency))}</td></tr>`).join('');}
function field(label,value){const digits=label==='Phone'?phoneDigits(value):'';const content=/^965\d{8}$/.test(digits)?`<a href="tel:+${digits}">${escapeHtml(value||'\u2014')}</a>`:escapeHtml(value||'\u2014');return `<tr><th style="text-align:start;vertical-align:top;padding:7px 12px 7px 0;min-width:96px;white-space:nowrap;font-size:13px;color:#6b7280;font-weight:400;">${label}</th><td style="padding:7px 0;line-height:1.7;overflow-wrap:anywhere;" dir="auto">${content}</td></tr>`;}
function shell(title,content,english=false){return `<!doctype html><html lang="${english?'en':'ar'}" dir="${english?'ltr':'rtl'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:480px){.email-pad{padding:14px!important}.email-outer{padding:8px!important}}</style></head><body style="margin:0;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif;color:#111827;"><div class="email-outer" style="padding:20px 10px;"><div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"><div class="email-pad" style="padding:22px;background:#111827;color:#fff;"><div style="font-size:23px;font-weight:700;">Smart Kids Kuwait</div><div style="margin-top:8px;line-height:1.6;">${title}</div></div><div class="email-pad" style="padding:24px;">${content}</div></div></div></body></html>`;}
function itemsTable(order,currency,english=false){return `<table role="presentation" style="width:100%;border-collapse:collapse;table-layout:auto;margin:18px 0;"><thead><tr style="background:#f9fafb;"><th style="padding:10px 8px;text-align:start;">${english?'Item':'المنتج'}</th><th style="padding:10px 6px;">${english?'Qty':'الكمية'}</th><th style="padding:10px 6px;text-align:end;white-space:nowrap;">${english?'Line total':'الإجمالي'}</th></tr></thead><tbody>${buildItemsRows(order.items,currency)}</tbody></table><table role="presentation" style="width:100%;border-collapse:collapse;">${buildSummaryRows(order,currency,english)}</table>`;}
function buildCustomerEmailHtml({order}){return shell('تم استلام طلبك '+escapeHtml(order.order_number),`<h1 style="font-size:21px;line-height:1.5;margin:0 0 10px;">✓ شكرًا لطلبك</h1><p style="line-height:1.8;">مرحبًا ${escapeHtml(safeText(order.customer_name,'عميلنا العزيز'))}، سنراجع طلبك ونتواصل معك لتأكيده وتجهيزه.</p><table role="presentation" style="width:100%;border-collapse:collapse;">${field('رقم الطلب',order.order_number)}${field('تاريخ الطلب',presentation.formatDate(order.created_at))}${field('طريقة الدفع',presentation.payment(order))}${field('الهاتف',order.customer_phone)}${field('العنوان',presentation.address(order))}</table>${itemsTable(order,'د.ك')}`);}
function buildAdminEmailHtml({order}){
 const digits=phoneDigits(order.customer_phone),customerNote=safeText(order.notes).split('\n<!--OAI_ORDER_META:')[0].split(' | ').filter(v=>!/^\s*(?:Payment|Billing):/.test(v)).join(' | ');
 const contact=/^965\d{8}$/.test(digits)?`<p><a href="tel:+${digits}">Call customer</a> · <a href="https://wa.me/${digits}">WhatsApp</a></p>`:'';
 const orderUrl='https://smartkidskw.com/order-details.html?id='+encodeURIComponent(String(order.id||''));
 return shell('New order received',`<h1 style="font-size:22px;">Order ${escapeHtml(order.order_number)}</h1><table role="presentation" style="width:100%;border-collapse:collapse;">${field('Customer',order.customer_name)}${field('Order date',presentation.formatDate(order.created_at,'en-US'))}${field('Status',order.status)}${field('Payment',presentation.payment(order,true))}${field('Email',order.customer_email)}${field('Phone',order.customer_phone)}${field('Address',presentation.address(order))}${customerNote?field('Customer notes',customerNote):''}</table>${contact}${itemsTable(order,'KWD',true)}<p style="margin-top:24px;"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 18px;background:#4a064f;color:white;border-radius:8px;text-decoration:none;">Open order</a></p>`,true);
}

async function sendOrderEmails({ order }) {
  const apiKey = safeText(process.env.RESEND_API_KEY);
  const fromAddress = safeText(process.env.MAIL_FROM);
  const from = sender(fromAddress);
  const adminTo = safeText(process.env.ADMIN_ORDERS_EMAIL);
  const storeName = safeText(process.env.STORE_NAME, 'Smart Kids Store');
  const currency = safeText(process.env.DEFAULT_CURRENCY, 'KWD');

  if (!apiKey) throw new Error('RESEND_API_KEY is missing');
  if (!fromAddress) throw new Error('MAIL_FROM is missing');

  const resend = new Resend(apiKey);

  const orderNumber = safeText(order?.order_number, '—');
  const customerName = safeText(order?.customer_name, '—');
  const customerEmail = safeText(order?.customer_email);

  if (adminTo) {
    const response = await resend.emails.send({
      from,
      to: adminTo,
      subject: `[${storeName}] Order ${orderNumber} placed by ${customerName}`,
      html: buildAdminEmailHtml({ storeName, order, currency })
    }, { idempotencyKey: `order-${order.id}-${orderNumber}-admin` });
    if(response.error)throw new Error('Order email was rejected by provider');
  }

  if (customerEmail) {
    const response = await resend.emails.send({
      from,
      to: customerEmail,
      subject: `تم استلام طلبك ${orderNumber} | Smart Kids Kuwait`,
      html: buildCustomerEmailHtml({ storeName, order, currency })
    }, { idempotencyKey: `order-${order.id}-${orderNumber}-customer` });
    if(response.error)throw new Error('Order email was rejected by provider');
  }

  return true;
}

function buildInvoiceHtml(order){
  let billing={};try{billing=JSON.parse(order.billing_address||'{}');}catch{}
  const address=order.billing_mode==='different'
    ? [billing.firstName,billing.lastName,billing.address1,billing.address2,billing.city,billing.governorate,billing.country,billing.phone].filter(Boolean).join(' - ')
    : [order.customer_name,order.customer_address,order.customer_city,order.customer_district,order.customer_phone].filter(Boolean).join(' - ');
  const html=buildCustomerEmailHtml({storeName:safeText(process.env.STORE_NAME,'Smart Kids Store'),order,currency:safeText(process.env.DEFAULT_CURRENCY,'KWD')})
    .replace('تم استلام طلبك '+escapeHtml(order.order_number),'فاتورة الطلب '+escapeHtml(order.order_number)).replace('✓ شكرًا لطلبك','فاتورة الطلب');
  const shipping=presentation.address(order);
  return html.replace('</body>',`<div dir="rtl" style="padding:20px;"><strong>عنوان الفاتورة</strong><p>${escapeHtml(address)}</p><strong>عنوان الشحن</strong><p>${escapeHtml(shipping)}</p></div></body>`);
}
async function sendInvoiceEmail({order,idempotencyKey}){
  const apiKey=safeText(process.env.RESEND_API_KEY),from=safeText(process.env.MAIL_FROM),to=safeText(order.customer_email);
  if(!apiKey||!from||!to||to.endsWith('@smartkids.local'))throw new Error('Invoice sender or deliverable customer email is unavailable');
  let response;
  try{response=await new Resend(apiKey).emails.send({from:sender(from),to,subject:`فاتورة الطلب ${safeText(order.order_number)}`,html:buildInvoiceHtml(order)},{idempotencyKey});}
  catch{const error=new Error('Invoice delivery status is unknown');error.deliveryUnknown=true;throw error;}
  if(response.error||!response.data?.id)throw new Error('Invoice was not accepted by provider');
  return {id:response.data.id};
}
module.exports={sendOrderEmails,sendInvoiceEmail,buildInvoiceHtml,buildCustomerEmailHtml,buildAdminEmailHtml};
