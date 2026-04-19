const { Resend } = require('resend');

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatMoney(amount, currency = 'KWD') {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toFixed(3)} ${currency}`;
}

function formatDateTime(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function buildAdminEmailHtml({ storeName, order, currency }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = safeText(order.order_number || order.orderNumber, '—');
  const customerName = safeText(order.customer_name || order.customerName, '—');

  const subtotal = formatMoney(order.subtotal, currency);
  const shipping = formatMoney(order.shipping_cost, currency);
  const total = formatMoney(order.total, currency);

  const createdAt = formatDateTime(order.created_at || order.createdAt);

  const addressLines = [
    safeText(order.customer_address),
    safeText(order.customer_district),
    safeText(order.customer_city),
    'Kuwait'
  ].filter(Boolean);

  const itemsHtml = items.map((it) => {
    const name = safeText(it.product_name, 'Item');
    const qty = Number(it.quantity || 1);
    const lineTotal = formatMoney((Number(it.price || 0) * qty), currency);
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">${name} × ${qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${lineTotal}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.6">
    <h2 style="margin:0 0 6px">${storeName}</h2>
    <p style="margin:0 0 14px;font-size:15px">
      <strong>${customerName}</strong> placed order <strong>${orderNumber}</strong> on ${createdAt}.
    </p>

    <h3 style="margin:18px 0 8px">Order summary</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${itemsHtml || `<tr><td>No items</td><td></td></tr>`}
      <tr>
        <td style="padding:10px 0">Subtotal</td>
        <td style="padding:10px 0;text-align:right;white-space:nowrap;">${subtotal}</td>
      </tr>
      <tr>
        <td style="padding:10px 0">Shipping</td>
        <td style="padding:10px 0;text-align:right;white-space:nowrap;">${shipping}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-weight:bold;border-top:2px solid #111">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:bold;border-top:2px solid #111;white-space:nowrap;">${total}</td>
      </tr>
    </table>

    <h3 style="margin:18px 0 8px">Customer</h3>
    <p style="margin:0;font-size:14px">
      Email: ${safeText(order.customer_email, '—')}<br/>
      Phone: ${safeText(order.customer_phone, '—')}
    </p>

    <h3 style="margin:18px 0 8px">Shipping address</h3>
    <p style="margin:0;font-size:14px">${addressLines.join('<br/>') || '—'}</p>
  </div>
  `;
}

function buildCustomerEmailHtml({ storeName, storeDomain, order, currency }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = safeText(order.order_number || order.orderNumber, '—');
  const customerName = safeText(order.customer_name || order.customerName, 'عميلنا العزيز');

  const subtotal = formatMoney(order.subtotal, currency);
  const shipping = formatMoney(order.shipping_cost, currency);
  const total = formatMoney(order.total, currency);

  const createdAt = formatDateTime(order.created_at || order.createdAt);

  const itemsHtml = items.map((it) => {
    const name = safeText(it.product_name, 'Item');
    const qty = Number(it.quantity || 1);
    const lineTotal = formatMoney((Number(it.price || 0) * qty), currency);
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">${name} × ${qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${lineTotal}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.8">
    <h2 style="margin:0 0 6px">${storeName}</h2>
    <p style="margin:0 0 12px;font-size:15px">مرحبًا ${customerName}،</p>
    <p style="margin:0 0 12px;font-size:15px">
      تم استلام طلبك بنجاح.<br/>
      رقم الطلب: <strong>${orderNumber}</strong><br/>
      تاريخ الطلب: ${createdAt}
    </p>

    <h3 style="margin:18px 0 8px">ملخص الطلب</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${itemsHtml || `<tr><td>لا توجد منتجات</td><td></td></tr>`}
      <tr>
        <td style="padding:10px 0">المجموع الفرعي</td>
        <td style="padding:10px 0;text-align:right;white-space:nowrap;">${subtotal}</td>
      </tr>
      <tr>
        <td style="padding:10px 0">التوصيل</td>
        <td style="padding:10px 0;text-align:right;white-space:nowrap;">${shipping}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-weight:bold;border-top:2px solid #111">الإجمالي</td>
        <td style="padding:12px 0;text-align:right;font-weight:bold;border-top:2px solid #111;white-space:nowrap;">${total}</td>
      </tr>
    </table>

    <p style="margin:18px 0 0;font-size:14px;color:#444">
      يمكنك تتبع الطلب من هنا:
      <a href="https://${storeDomain}/track-order.html?order=${encodeURIComponent(orderNumber)}">صفحة تتبع الطلب</a>
    </p>

    <p style="margin:18px 0 0;font-size:14px;color:#666">
      شكرًا لتسوقك معنا
    </p>
  </div>
  `;
}

async function sendOrderEmails({ order }) {
  const apiKey = safeText(process.env.RESEND_API_KEY);
  const from = safeText(process.env.MAIL_FROM);
  const adminTo = safeText(process.env.ADMIN_ORDERS_EMAIL);
  const storeName = safeText(process.env.STORE_NAME, 'Smart Kids Store');
  const storeDomain = safeText(process.env.STORE_DOMAIN, 'smartkidskw.com');
  const currency = safeText(process.env.DEFAULT_CURRENCY, 'KWD');

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing');
  }

  if (!from) {
    throw new Error('MAIL_FROM is missing');
  }

  const resend = new Resend(apiKey);

  const orderNumber = safeText(order?.order_number, '—');
  const customerName = safeText(order?.customer_name, '—');
  const customerEmail = safeText(order?.customer_email);

  if (adminTo) {
    await resend.emails.send({
      from,
      to: adminTo,
      subject: `[${storeName}] Order ${orderNumber} placed by ${customerName}`,
      html: buildAdminEmailHtml({ storeName, order, currency })
    });
  }

  if (customerEmail) {
    await resend.emails.send({
      from,
      to: customerEmail,
      subject: `[${storeName}] تم استلام طلبك ${orderNumber}`,
      html: buildCustomerEmailHtml({ storeName, storeDomain, order, currency })
    });
  }

  return true;
}

module.exports = {
  sendOrderEmails
};
