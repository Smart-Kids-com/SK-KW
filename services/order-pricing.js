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
  const shippingFils = money(HELPERS.calculateShipping(subtotalFils / 1000));
  const {discount,discountFils}=await require('./discounts').calculate(db,items,subtotalFils,shippingFils,requestedCode);
  return {items,subtotal:subtotalFils/1000,discount_id:discount?.id??null,
    discount_code:discount?require('./discounts').normalizeCode(discount.code):'',discount_type:discount?.type||'',discount_value:discount?Number(discount.value):0,
    discount_amount:discountFils/1000,shipping_cost:shippingFils/1000,total:Math.max(0,subtotalFils+shippingFils-discountFils)/1000,
    discount_snapshot:discount,discount_label:discount?(discount.title||discount.code):''};
}

module.exports = { priceOrder, OrderPricingError };
