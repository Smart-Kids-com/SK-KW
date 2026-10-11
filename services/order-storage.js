'use strict';

const { OrderPricingError } = require('./order-pricing');

// An order, its item snapshots and its coupon reservation commit together.
async function savePricedOrder(db, record, items, pricing) {
  record = { ...record, inventory_managed: 1 };
  const orderColumns = (await db.all('PRAGMA table_info(orders)')).map(row => row.name);
  const installed = await db.get("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name IN ('order_inventory_insert_guard','order_inventory_reserve','order_inventory_status','order_inventory_transition')");
  if (Number(installed?.n) !== 4) throw new Error('Order inventory migration is required before checkout');
  if (Object.keys(record).some(name => !orderColumns.includes(name))) {
    throw new Error('Order schema requires the explicit order-pricing migration');
  }
  const itemColumns = (await db.all('PRAGMA table_info(order_items)')).map(row => row.name);
  const statements = [];
  if (pricing.discount_id != null) {
    statements.push({ sql: `UPDATE discount_codes SET used_count=COALESCE(used_count,0)+1,
      updated_at=CURRENT_TIMESTAMP WHERE id=? AND UPPER(TRIM(code))=? AND is_active=1 AND type=? AND value=?
      AND (usage_limit IS NULL OR COALESCE(used_count,0)<usage_limit)
      AND COALESCE(minimum_order_amount,0)<=?
      AND (starts_at IS NULL OR starts_at='' OR julianday(starts_at)<=julianday('now'))
      AND (expires_at IS NULL OR expires_at='' OR julianday(expires_at)>=julianday('now'))`,
    args: [pricing.discount_id, pricing.discount_code, pricing.discount_type, pricing.discount_value, pricing.subtotal] });
  }
  const names = Object.keys(record);
  statements.push({ sql: `INSERT INTO orders (${names.join(',')}) SELECT ${names.map(() => '?').join(',')}
    ${pricing.discount_id != null ? 'WHERE changes()=1' : ''}`, args: Object.values(record) });
  const insertIndex = statements.length - 1;
  for (const item of items) {
    const values = { product_id: item.product_id, product_name: item.product_name,
      product_image: item.product_image, price: item.price, product_price: item.price,
      quantity: item.quantity, subtotal: Math.round(item.price * item.quantity * 1000) / 1000 };
    const fields = Object.keys(values).filter(name => itemColumns.includes(name));
    // Missing order_id violates NOT NULL and rolls back an unavailable coupon reservation.
    statements.push({ sql: `INSERT INTO order_items (order_id,${fields.join(',')})
      VALUES ((SELECT id FROM orders WHERE order_number=?),${fields.map(() => '?').join(',')})`,
    args: [record.order_number, ...fields.map(name => values[name])] });
  }
  statements.push({ sql: "UPDATE orders SET order_number='SK'||(4060+id), updated_at=CURRENT_TIMESTAMP WHERE order_number=?",
    args: [record.order_number] });
  if(record.abandoned_checkout_token){
    statements.splice(statements.length-1,0,{sql:`UPDATE abandoned_checkouts SET status='recovered',
      recovered_order_id=(SELECT CAST(id AS TEXT) FROM orders WHERE order_number=?),
      recovered_order_number=(SELECT 'SK'||(4060+id) FROM orders WHERE order_number=?),
      updated_at=CURRENT_TIMESTAMP WHERE checkout_token=?`,args:[record.order_number,record.order_number,record.abandoned_checkout_token]});
  }
  let results;
  try {
    if (db.useTurso) {
      results = await (await db.ensureTursoClient()).batch(statements, 'write');
    } else {
      results = await db.transaction(async () => {
        const rows = [];
        for (const statement of statements) rows.push(await db.run(statement.sql, statement.args));
        return rows;
      });
    }
  } catch (error) {
    if (String(error.message).includes('ORDER_STOCK_UNAVAILABLE')) {
      throw new OrderPricingError('الكمية المطلوبة لم تعد متاحة');
    }
    if (pricing.discount_id != null && String(error.message).includes('order_items.order_id')) {
      throw new OrderPricingError('كود الخصم لم يعد متاحاً، أعد المحاولة');
    }
    throw error;
  }
  return Number(results[insertIndex].lastInsertRowid ?? results[insertIndex].id);
}

module.exports = { savePricedOrder };
