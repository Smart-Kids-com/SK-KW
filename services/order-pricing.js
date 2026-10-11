'use strict';

const { HELPERS } = require('../config/system');

class OrderPricingError extends Error {
  constructor(message) { super(message); this.status = 400; }
}
const invalid = message => { throw new OrderPricingError(message); };
const money = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.round(number * 1000))) {
    invalid('قيمة مالية غير صالحة');
  }
  return Math.round(number * 1000);
};

async function priceOrder(db, requestedItems, requestedCode) {
  if (!Array.isArray(requestedItems) || !requestedItems.length) invalid('الطلب يجب أن يحتوي على منتجات');
  const quantities = new Map();
  for (const item of requestedItems) {
    const id = String(item?.product_id ?? item?.productId ?? '').trim();
    const quantity = Number(item?.quantity);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) ||
        !Number.isSafeInteger(quantity) || quantity <= 0) invalid('معرف المنتج أو الكمية غير صالح');
    const combined = (quantities.get(id) || 0) + quantity;
    if (!Number.isSafeInteger(combined)) invalid('الكمية غير صالحة');
    quantities.set(id, combined);
  }
  const items = [];
  let subtotalFils = 0;
  for (const [id, quantity] of quantities) {
    const product = await db.get('SELECT id, product_name, image_url, price, sale_price, status FROM products WHERE id = ?', [id]);
    if (!product || product.status !== 'active') invalid('المنتج غير متاح للشراء');
    // Same sale rule as product-page.html, index.html and header.js.
    const regular = money(product.price);
    const sale = money(product.sale_price ?? 0);
    const unit = sale > 0 && regular > sale ? sale : regular;
    subtotalFils += unit * quantity;
    if (!Number.isSafeInteger(subtotalFils)) invalid('قيمة الطلب غير صالحة');
    items.push({ product_id: String(product.id), product_name: product.product_name,
      product_image: product.image_url || '', price: unit / 1000, quantity });
  }
  const code = String(requestedCode ?? '').trim().toUpperCase();
  let discount = null;
  let discountFils = 0;
  if (code) {
    discount = await db.get('SELECT * FROM discount_codes WHERE UPPER(TRIM(code)) = ?', [code]);
    if (!discount || !Number(discount.is_active)) invalid('كود الخصم غير صالح أو غير مفعل');
    const now = Date.now();
    for (const [field, fails] of [['starts_at', date => now < date], ['expires_at', date => now > date]]) {
      if (discount[field]) {
        const date = Date.parse(discount[field]);
        if (!Number.isFinite(date) || fails(date)) invalid('كود الخصم خارج فترة الصلاحية');
      }
    }
    if (discount.usage_limit != null && Number(discount.used_count || 0) >= Number(discount.usage_limit)) {
      invalid('تم الوصول إلى الحد الأقصى لاستخدام كود الخصم');
    }
    if (subtotalFils < money(discount.minimum_order_amount || 0)) invalid('الطلب أقل من الحد الأدنى لكود الخصم');
    const value = Number(discount.value);
    if (!Number.isFinite(value) || value < 0 || !['percentage', 'fixed'].includes(discount.type)) invalid('إعدادات كود الخصم غير صالحة');
    discountFils = Math.min(subtotalFils, discount.type === 'percentage'
      ? Math.round(subtotalFils * value / 100) : money(value));
  }
  const subtotal = subtotalFils / 1000;
  const shippingFils = money(HELPERS.calculateShipping(subtotal));
  return { items, subtotal, discount_id: discount?.id ?? null, discount_code: discount ? code : '', discount_type: discount?.type || '',
    discount_value: discount ? Number(discount.value) : 0, discount_amount: discountFils / 1000,
    shipping_cost: shippingFils / 1000, total: (subtotalFils - discountFils + shippingFils) / 1000 };
}

module.exports = { priceOrder, OrderPricingError };
