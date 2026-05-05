const { Resend } = require('resend');

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(amount, currency = 'KWD') {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toFixed(3)} ${currency}`;
}

function formatDateTime(dateValue, locale = 'ar-KW') {
  const d = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;

  return safeDate.toLocaleString(locale, {
    timeZone: 'Asia/Kuwait',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function buildItemsRows(items, currency) {
  if (!Array.isArray(items) || !items.length) {
    return `
      <tr>
        <td colspan="3" style="padding:16px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb;">
          لا توجد منتجات
        </td>
      </tr>
    `;
  }

  return items.map((it) => {
    const name = safeText(it.product_name, 'منتج');
    const qty = Math.max(1, Number(it.quantity || 1));
    const unitPrice = Number(it.price || 0);
    const lineTotal = formatMoney(unitPrice * qty, currency);

    return `
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">
          ${escapeHtml(name)}
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:center;white-space:nowrap;">
          ${qty}
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:left;white-space:nowrap;font-weight:700;" dir="ltr">
          ${escapeHtml(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');
}

function buildSummaryRows(order, currency, labels = {}) {
  const subtotal = formatMoney(order.subtotal, currency);
  const shipping = formatMoney(order.shipping_cost, currency);
  const discount = formatMoney(order.discount_amount, currency);
  const total = formatMoney(order.total, currency);

  return `
    <tr>
      <td style="padding:10px 0;color:#6b7280;">${labels.subtotal || 'المجموع الفرعي'}</td>
      <td style="padding:10px 0;text-align:left;white-space:nowrap;font-weight:700;" dir="ltr">${escapeHtml(subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#6b7280;">${labels.shipping || 'التوصيل'}</td>
      <td style="padding:10px 0;text-align:left;white-space:nowrap;font-weight:700;" dir="ltr">${escapeHtml(shipping)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#6b7280;">${labels.discount || 'الخصم'}</td>
      <td style="padding:10px 0;text-align:left;white-space:nowrap;font-weight:700;" dir="ltr">${escapeHtml(discount)}</td>
    </tr>
    <tr>
      <td style="padding:14px 0 0;border-top:1px solid #e5e7eb;font-size:16px;font-weight:800;color:#111827;">${labels.total || 'الإجمالي'}</td>
      <td style="padding:14px 0 0;border-top:1px solid #e5e7eb;text-align:left;white-space:nowrap;font-size:16px;font-weight:800;color:#111827;" dir="ltr">${escapeHtml(total)}</td>
    </tr>
  `;
}

function buildCustomerEmailHtml({ storeName, order, currency }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = safeText(order.order_number || order.orderNumber, '—');
  const customerName = safeText(order.customer_name || order.customerName, 'عميلنا العزيز');
  const createdAt = formatDateTime(order.created_at || order.createdAt, 'ar-KW');

  return `
  <div style="margin:0;padding:24px;background:#f3f4f6;" dir="rtl">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;font-family:Tahoma,Arial,sans-serif;color:#111827;">
      <div style="background:#111827;padding:26px 28px;text-align:right;">
        <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.4;">${escapeHtml(storeName)}</div>
        <div style="font-size:14px;color:#d1d5db;margin-top:8px;">تم استلام طلبك بنجاح</div>
      </div>

      <div style="padding:28px;">
        <div style="font-size:22px;font-weight:800;color:#111827;margin-bottom:10px;">شكرًا لطلبك 🌷</div>
        <div style="font-size:15px;color:#374151;line-height:2;margin-bottom:18px;">
          مرحبًا ${escapeHtml(customerName)}،<br>
          تم استلام طلبك بنجاح وبدأنا مراجعته.
        </div>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;margin-bottom:22px;">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
            <div style="font-size:14px;color:#6b7280;">رقم الطلب</div>
            <div style="font-size:16px;font-weight:800;color:#111827;" dir="ltr">${escapeHtml(orderNumber)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="font-size:14px;color:#6b7280;">تاريخ الطلب</div>
            <div style="font-size:15px;font-weight:700;color:#111827;">${escapeHtml(createdAt)}</div>
          </div>
        </div>

        <div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:12px;">تفاصيل الطلب</div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;margin-bottom:20px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:14px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">المنتج</th>
              <th style="padding:14px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">الكمية</th>
              <th style="padding:14px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRows(items, currency)}
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          ${buildSummaryRows(order, currency)}
        </table>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;">
          <div style="font-size:14px;color:#374151;line-height:2;">
            سيتم التواصل معك في أقرب وقت لتأكيد الطلب وتجهيزه.
          </div>
        </div>

        <div style="margin-top:22px;font-size:14px;color:#6b7280;line-height:2;">
          شكرًا لتسوقك معنا
        </div>
      </div>
    </div>
  </div>
  `;
}

function buildAdminEmailHtml({ storeName, order, currency }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = safeText(order.order_number || order.orderNumber, '—');
  const customerName = safeText(order.customer_name || order.customerName, '—');
  const createdAt = formatDateTime(order.created_at || order.createdAt, 'en-US');

  const addressLines = [
    safeText(order.customer_address),
    safeText(order.customer_district),
    safeText(order.customer_city),
    'Kuwait'
  ].filter(Boolean);

  return `
  <div style="margin:0;padding:24px;background:#f3f4f6;" dir="ltr">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="background:#111827;padding:24px 28px;">
        <div style="font-size:26px;font-weight:800;color:#ffffff;">${escapeHtml(storeName)}</div>
        <div style="font-size:14px;color:#d1d5db;margin-top:8px;">New order received</div>
      </div>

      <div style="padding:28px;">
        <div style="font-size:22px;font-weight:800;margin-bottom:14px;">Order ${escapeHtml(orderNumber)}</div>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;margin-bottom:22px;">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
            <div style="font-size:14px;color:#6b7280;">Customer</div>
            <div style="font-size:15px;font-weight:700;">${escapeHtml(customerName)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="font-size:14px;color:#6b7280;">Order date</div>
            <div style="font-size:15px;font-weight:700;">${escapeHtml(createdAt)}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;margin-bottom:20px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:14px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Item</th>
              <th style="padding:14px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Qty</th>
              <th style="padding:14px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Line total</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRows(items, currency)}
          </tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          ${buildSummaryRows(order, currency, {
            subtotal: 'Subtotal',
            shipping: 'Shipping',
            discount: 'Discount',
            total: 'Total'
          })}
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;">
            <div style="font-size:13px;color:#6b7280;margin-bottom:8px;font-weight:700;">Customer</div>
            <div style="font-size:14px;line-height:1.9;">
              Email: ${escapeHtml(safeText(order.customer_email, '—'))}<br>
              Phone: ${escapeHtml(safeText(order.customer_phone, '—'))}
            </div>
          </div>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;">
            <div style="font-size:13px;color:#6b7280;margin-bottom:8px;font-weight:700;">Shipping address</div>
            <div style="font-size:14px;line-height:1.9;">
              ${addressLines.length ? addressLines.map(escapeHtml).join('<br>') : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

async function sendOrderEmails({ order }) {
  const apiKey = safeText(process.env.RESEND_API_KEY);
  const from = safeText(process.env.MAIL_FROM);
  const adminTo = safeText(process.env.ADMIN_ORDERS_EMAIL);
  const storeName = safeText(process.env.STORE_NAME, 'Smart Kids Store');
  const currency = safeText(process.env.DEFAULT_CURRENCY, 'KWD');

  if (!apiKey) throw new Error('RESEND_API_KEY is missing');
  if (!from) throw new Error('MAIL_FROM is missing');

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
      html: buildCustomerEmailHtml({ storeName, order, currency })
    });
  }

  return true;
}

module.exports = {
  sendOrderEmails
};