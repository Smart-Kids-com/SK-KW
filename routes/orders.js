// routes/orders.js
// ORDER: POST/PUT/DELETE -> specific GET paths -> generic GET :id -> GET /

const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');
const { SYSTEM_CONFIG, HELPERS } = require('../config/system');
const { sendOrderEmails } = require('../utils/email');

const ORDERS_TABLE = SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS;
const ORDER_ITEMS_TABLE = SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS;

const META_START = '\n<!--OAI_ORDER_META:';
const META_END = ':OAI_ORDER_META-->';

/**
 * Customer sync config
 * - Shopify-like identity: email OR phone
 */
const CUSTOMERS_TABLE = 'customers';
const CUSTOMER_SYNC_BATCH_LIMIT = 5000; // backfill safety limit per request

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeEmail(email = '') {
  return safeText(email).toLowerCase();
}

function normalizePhone(phone = '') {
  // digits-only to reduce format mismatches
  return safeText(phone).replace(/[^\d]/g, '');
}

function isValidOrderStatus(status) {
  return Object.values(SYSTEM_CONFIG.ORDER_CONFIG.STATUSES).includes(status);
}

function normalizeStatus(status, fallback = SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING) {
  return isValidOrderStatus(status) ? status : fallback;
}

function parseNotesAndMeta(notes) {
  const raw = String(notes || '');
  const startIndex = raw.indexOf(META_START);
  const endIndex = raw.lastIndexOf(META_END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return {
      visibleNotes: raw.trim(),
      meta: {
        tags: [],
        archived: false,
        archived_prev_status: null,
        fulfillment_requested: false,
        fulfillment_location: '',
        restocked: false,
        returned: false,
        invoice_sent_at: null
      }
    };
  }

  const visibleNotes = raw.slice(0, startIndex).trim();
  const jsonPart = raw.slice(startIndex + META_START.length, endIndex).trim();

  try {
    const meta = JSON.parse(jsonPart);
    return {
      visibleNotes,
      meta: {
        tags: Array.isArray(meta.tags)
          ? meta.tags.map(tag => safeText(tag)).filter(Boolean)
          : [],
        archived: Boolean(meta.archived),
        archived_prev_status: meta.archived_prev_status ? safeText(meta.archived_prev_status) : null,
        fulfillment_requested: Boolean(meta.fulfillment_requested),
        fulfillment_location: safeText(meta.fulfillment_location),
        restocked: Boolean(meta.restocked),
        returned: Boolean(meta.returned),
        invoice_sent_at: meta.invoice_sent_at ? safeText(meta.invoice_sent_at) : null
      }
    };
  } catch (_) {
    return {
      visibleNotes: raw.trim(),
      meta: {
        tags: [],
        archived: false,
        archived_prev_status: null,
        fulfillment_requested: false,
        fulfillment_location: '',
        restocked: false,
        returned: false,
        invoice_sent_at: null
      }
    };
  }
}

function buildNotesWithMeta(visibleNotes, meta) {
  const cleanNotes = String(visibleNotes || '').trim();
  const payload = {
    tags: Array.isArray(meta?.tags) ? meta.tags.map(tag => safeText(tag)).filter(Boolean) : [],
    archived: Boolean(meta?.archived),
    archived_prev_status: meta?.archived_prev_status ? safeText(meta.archived_prev_status) : null,
    fulfillment_requested: Boolean(meta?.fulfillment_requested),
    fulfillment_location: safeText(meta?.fulfillment_location),
    restocked: Boolean(meta?.restocked),
    returned: Boolean(meta?.returned),
    invoice_sent_at: meta?.invoice_sent_at ? safeText(meta.invoice_sent_at) : null
  };

  return `${cleanNotes}${META_START}${JSON.stringify(payload)}${META_END}`;
}

function mergeOrderMeta(order) {
  if (!order) return null;

  const { visibleNotes, meta } = parseNotesAndMeta(order.notes);

  return {
    ...order,
    notes: visibleNotes,
    tags: meta.tags,
    archived: meta.archived,
    archived_prev_status: meta.archived_prev_status,
    fulfillment_requested: meta.fulfillment_requested,
    fulfillment_location: meta.fulfillment_location,
    restocked: meta.restocked,
    returned: meta.returned,
    invoice_sent_at: meta.invoice_sent_at
  };
}

async function getOrderWithItems(id) {
  const order = await db.get(
    `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
    [id]
  );

  if (!order) return null;

  const items = await db.all(
    `SELECT * FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
    [id]
  );

  return {
    ...mergeOrderMeta(order),
    items
  };
}

async function getOrderByNumberWithItems(orderNumber) {
  const order = await db.get(
    `SELECT * FROM ${ORDERS_TABLE} WHERE order_number = ?`,
    [orderNumber]
  );

  if (!order) return null;

  const items = await db.all(
    `SELECT * FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
    [order.id]
  );

  return {
    ...mergeOrderMeta(order),
    items
  };
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const quantity = Math.max(1, toNumber(item.quantity, 1));
      const price = Math.max(0, toNumber(item.price, item.unit_price ?? 0));

      const productName = safeText(
        item.product_name ||
        item.name ||
        item.title ||
        `منتج ${index + 1}`
      );

      const productId = safeText(
        item.product_id ||
        item.productId ||
        `manual_${Date.now()}_${index}`
      );

      const productImage = safeText(
        item.product_image ||
        item.image ||
        item.image_url ||
        ''
      );

      return {
        product_id: productId,
        product_name: productName || `منتج ${index + 1}`,
        product_image: productImage,
        price,
        quantity
      };
    })
    .filter(item => item.product_name && item.quantity > 0);
}

function calculateSubtotal(items) {
  return items.reduce((sum, item) => {
    return sum + (toNumber(item.price, 0) * toNumber(item.quantity, 1));
  }, 0);
}

async function replaceOrderItems(orderId, items) {
  await db.run(
    `DELETE FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
    [orderId]
  );

  for (const item of items) {
    await db.run(
      `INSERT INTO ${ORDER_ITEMS_TABLE}
      (order_id, product_id, product_name, product_image, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        item.product_id,
        item.product_name,
        item.product_image,
        toNumber(item.price, 0),
        toNumber(item.quantity, 1)
      ]
    );
  }
}

async function updateOrderNotesMeta(orderId, mutator) {
  const order = await db.get(
    `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
    [orderId]
  );

  if (!order) return null;

  const parsed = parseNotesAndMeta(order.notes);
  const nextMeta = mutator({
    ...parsed.meta
  }, parsed.visibleNotes);

  const finalNotes = buildNotesWithMeta(parsed.visibleNotes, nextMeta);

  await db.run(
    `UPDATE ${ORDERS_TABLE}
     SET notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [finalNotes, orderId]
  );

  return getOrderWithItems(orderId);
}

async function ensureOrderExists(id) {
  const order = await db.get(
    `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
    [id]
  );

  return order || null;
}

/**
 * ----------------------------
 * Customers sync helpers
 * ----------------------------
 */

async function ensureCustomersTableExists() {
  // Mirrors your customers table schema (from customers routes)
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${CUSTOMERS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      city TEXT,
      area TEXT,
      status TEXT DEFAULT 'new',
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      accepts_marketing INTEGER DEFAULT 0,
      marketing_opt_in INTEGER DEFAULT 0,
      last_order_at TEXT,
      is_blocked INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function findCustomerByEmailOrPhone(email, phone) {
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);

  if (!e && !p) return null;

  const where = [];
  const params = [];

  if (e) {
    where.push(`LOWER(TRIM(email)) = ?`);
    params.push(e);
  }

  if (p) {
    where.push(
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(phone), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?`
    );
    params.push(p);
  }

  const row = await db.get(
    `SELECT *
     FROM ${CUSTOMERS_TABLE}
     WHERE (${where.join(' OR ')})
     ORDER BY id ASC
     LIMIT 1`,
    params
  );

  return row || null;
}

async function recomputeCustomerStatsByIdentity(email, phone) {
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);

  if (!e && !p) {
    return { total_orders: 0, total_spent: 0, last_order_at: null };
  }

  const whereParts = [];
  const params = [];

  if (e) {
    whereParts.push(`LOWER(TRIM(customer_email)) = ?`);
    params.push(e);
  }

  if (p) {
    whereParts.push(
      `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(customer_phone), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?`
    );
    params.push(p);
  }

  const whereSql = `(${whereParts.join(' OR ')})`;

  const row = await db.get(
    `
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(COALESCE(total, 0)), 0) as total_spent,
      MAX(created_at) as last_order_at
    FROM ${ORDERS_TABLE}
    WHERE ${whereSql}
    `,
    params
  );

  return {
    total_orders: Number(row?.total_orders || 0),
    total_spent: Number(row?.total_spent || 0),
    last_order_at: row?.last_order_at || null
  };
}

async function upsertCustomerFromOrderSnapshot(orderSnapshot) {
  const fullName = safeText(orderSnapshot.customer_name || orderSnapshot.customerName);
  const email = safeText(orderSnapshot.customer_email || orderSnapshot.customerEmail);
  const phone = safeText(orderSnapshot.customer_phone || orderSnapshot.customerPhone);

  const city = safeText(orderSnapshot.customer_city || orderSnapshot.customerCity, '');
  const area = safeText(orderSnapshot.customer_district || orderSnapshot.customerDistrict, '');

  if (!fullName || !email || !phone) return { created: false, updated: false, customer: null };

  await ensureCustomersTableExists();

  const existing = await findCustomerByEmailOrPhone(email, phone);
  const stats = await recomputeCustomerStatsByIdentity(email, phone);

  if (!existing) {
    await db.run(
      `INSERT INTO ${CUSTOMERS_TABLE}
        (full_name, email, phone, city, area, status, total_orders, total_spent, last_order_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        fullName,
        email,
        phone,
        city,
        area,
        'active',
        stats.total_orders,
        stats.total_spent,
        stats.last_order_at
      ]
    );

    const created = await findCustomerByEmailOrPhone(email, phone);
    return { created: true, updated: false, customer: created };
  }

  const nextFullName = fullName || existing.full_name;
  const nextEmail = email || existing.email;
  const nextPhone = phone || existing.phone;
  const nextCity = city || existing.city;
  const nextArea = area || existing.area;

  await db.run(
    `UPDATE ${CUSTOMERS_TABLE}
     SET full_name = ?,
         email = ?,
         phone = ?,
         city = ?,
         area = ?,
         total_orders = ?,
         total_spent = ?,
         last_order_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      nextFullName,
      nextEmail,
      nextPhone,
      nextCity,
      nextArea,
      stats.total_orders,
      stats.total_spent,
      stats.last_order_at,
      existing.id
    ]
  );

  const updated = await db.get(`SELECT * FROM ${CUSTOMERS_TABLE} WHERE id = ?`, [existing.id]);
  return { created: false, updated: true, customer: updated || existing };
}

async function backfillCustomersFromOrders({ limit = CUSTOMER_SYNC_BATCH_LIMIT, offset = 0 } = {}) {
  await ensureCustomersTableExists();

  const parsedLimit = Math.max(1, Math.min(CUSTOMER_SYNC_BATCH_LIMIT, toInt(limit, CUSTOMER_SYNC_BATCH_LIMIT)));
  const parsedOffset = Math.max(0, toInt(offset, 0));

  const orders = await db.all(
    `
    SELECT
      customer_name,
      customer_email,
      customer_phone,
      customer_city,
      customer_district
    FROM ${ORDERS_TABLE}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
    `,
    [parsedLimit, parsedOffset]
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const o of orders) {
    const result = await upsertCustomerFromOrderSnapshot(o);
    if (result.created) created += 1;
    else if (result.updated) updated += 1;
    else skipped += 1;
  }

  return { processedOrders: orders.length, created, updated, skipped, limit: parsedLimit, offset: parsedOffset };
}

/**
 * ----------------------------
 * Existing functions
 * ----------------------------
 */

async function duplicateOrderById(id) {
  const source = await getOrderWithItems(id);
  if (!source) return null;

  const tempOrderNumber = `TEMP-${Date.now()}-${id}`;

  await db.run(
    `INSERT INTO ${ORDERS_TABLE}
    (
      order_number,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      customer_city,
      customer_district,
      subtotal,
      discount_code,
      discount_type,
      discount_value,
      discount_amount,
      shipping_cost,
      total,
      status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tempOrderNumber,
      safeText(source.customer_name),
      safeText(source.customer_email),
      safeText(source.customer_phone),
      safeText(source.customer_address),
      safeText(source.customer_city),
      safeText(source.customer_district),
      toNumber(source.subtotal, 0),
      safeText(source.discount_code),
      safeText(source.discount_type),
      toNumber(source.discount_value, 0),
      toNumber(source.discount_amount, 0),
      toNumber(source.shipping_cost, 0),
      toNumber(source.total, 0),
      normalizeStatus(source.status, SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING),
      buildNotesWithMeta(source.notes || '', {
        tags: Array.isArray(source.tags) ? source.tags : [],
        archived: false,
        archived_prev_status: null,
        fulfillment_requested: false,
        fulfillment_location: safeText(source.fulfillment_location),
        restocked: false,
        returned: false,
        invoice_sent_at: null
      })
    ]
  );

  const savedOrder = await db.get(
    `SELECT id
     FROM ${ORDERS_TABLE}
     WHERE order_number = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tempOrderNumber]
  );

  if (!savedOrder?.id) return null;

  const SHOPIFY_LAST_ORDER = 4060;
  const nextOrderNumber = `SK${SHOPIFY_LAST_ORDER + savedOrder.id}`;

  await db.run(
    `UPDATE ${ORDERS_TABLE}
     SET order_number = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextOrderNumber, savedOrder.id]
  );

  await replaceOrderItems(savedOrder.id, normalizeOrderItems(source.items));

  return getOrderWithItems(savedOrder.id);
}

function applySearchFilterLocally(rows, search) {
  const q = safeText(search).toLowerCase();
  if (!q) return rows;

  return rows.filter(order => {
    const parsed = parseNotesAndMeta(order.notes);
    const haystack = [
      order.order_number,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.customer_city,
      order.customer_district,
      order.customer_address,
      parsed.visibleNotes,
      ...(parsed.meta.tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

/**
 * GET /api/orders/customers-sync/preview
 * Preview without writing. Helpful before running the sync.
 */
router.get('/customers-sync/preview', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, toInt(req.query.limit, 25)));
    const offset = Math.max(0, toInt(req.query.offset, 0));

    const rows = await db.all(
      `
      SELECT
        customer_name,
        customer_email,
        customer_phone,
        customer_city,
        customer_district
      FROM ${ORDERS_TABLE}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    const preview = rows.map(r => ({
      full_name: safeText(r.customer_name),
      email: safeText(r.customer_email),
      phone: safeText(r.customer_phone),
      city: safeText(r.customer_city),
      area: safeText(r.customer_district)
    }));

    return res.json({ success: true, data: preview, pagination: { limit, offset, count: preview.length } });
  } catch (error) {
    console.error('❌ customers-sync preview error:', error);
    return res.status(500).json({ success: false, error: 'فشل في معاينة مزامنة العملاء' });
  }
});

/**
 * POST /api/orders/sync-customers
 * Run once (or multiple times) to backfill customers from historical orders.
 * Body/query:
 * - limit (max 5000)
 * - offset
 */
router.post('/sync-customers', async (req, res) => {
  try {
    const limit = req.body?.limit ?? req.query?.limit;
    const offset = req.body?.offset ?? req.query?.offset;

    const result = await backfillCustomersFromOrders({ limit, offset });

    return res.json({
      success: true,
      message: 'تمت مزامنة العملاء من الطلبات',
      data: result
    });
  } catch (error) {
    console.error('❌ sync-customers error:', error);
    return res.status(500).json({ success: false, error: 'فشل في مزامنة العملاء من الطلبات' });
  }
});

/**
 * POST /api/orders - إنشاء طلب جديد
 * + Sync customer record (Shopify-like)
 */
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerDistrict,
      items,
      notes,
      shippingCost,
      discountAmount,
      discountCode
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !customerAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة ناقصة'
      });
    }

    if (!HELPERS.validateEmail(customerEmail)) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني غير صحيح'
      });
    }

    if (!HELPERS.validateKuwaitiPhone(customerPhone)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف غير صحيح'
      });
    }

    const normalizedItems = normalizeOrderItems(items);
    if (!normalizedItems.length) {
      return res.status(400).json({
        success: false,
        error: 'الطلب يجب أن يحتوي على منتج واحد على الأقل'
      });
    }

    const subtotal = calculateSubtotal(normalizedItems);

    const finalShippingCost = Math.max(
      0,
      toNumber(shippingCost, HELPERS.calculateShipping(subtotal))
    );

    const finalDiscountAmount = Math.max(
      0,
      Math.min(toNumber(discountAmount, 0), subtotal)
    );

    const finalDiscountCode = safeText(discountCode).toUpperCase();
    const finalDiscountType = finalDiscountAmount > 0 ? 'fixed' : '';
    const finalDiscountValue = finalDiscountAmount;

    const total = Math.max(0, subtotal - finalDiscountAmount + finalShippingCost);
    const tempOrderNumber = `TEMP-${Date.now()}`;

    await db.run(
      `INSERT INTO ${ORDERS_TABLE}
      (
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        customer_city,
        customer_district,
        subtotal,
        discount_code,
        discount_type,
        discount_value,
        discount_amount,
        shipping_cost,
        total,
        status,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tempOrderNumber,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity || 'الكويت',
        customerDistrict || '',
        subtotal,
        finalDiscountCode,
        finalDiscountType,
        finalDiscountValue,
        finalDiscountAmount,
        finalShippingCost,
        total,
        SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING,
        buildNotesWithMeta(notes || '', {
          tags: [],
          archived: false,
          archived_prev_status: null,
          fulfillment_requested: false,
          fulfillment_location: '',
          restocked: false,
          returned: false,
          invoice_sent_at: null
        })
      ]
    );

    const savedOrder = await db.get(
      `SELECT id
       FROM ${ORDERS_TABLE}
       WHERE order_number = ?
       ORDER BY id DESC
       LIMIT 1`,
      [tempOrderNumber]
    );

    if (!savedOrder?.id) {
      return res.status(500).json({
        success: false,
        error: 'فشل في استخراج معرف الطلب'
      });
    }

    const SHOPIFY_LAST_ORDER = 4060;
    const nextOrderNumber = `SK${SHOPIFY_LAST_ORDER + savedOrder.id}`;

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET order_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextOrderNumber, savedOrder.id]
    );

    await replaceOrderItems(savedOrder.id, normalizedItems);

    await upsertCustomerFromOrderSnapshot({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_city: customerCity || 'الكويت',
      customer_district: customerDistrict || ''
    });

    const createdOrder = await getOrderWithItems(savedOrder.id);

    try {
      await sendOrderEmails({ order: createdOrder });
    } catch (emailError) {
      console.error('❌ خطأ في إرسال إيميلات الطلب:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: createdOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الطلب'
    });
  }
});

/**
 * GET /api/orders/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalOrders = await db.get(
      `SELECT COUNT(*) as count FROM ${ORDERS_TABLE}`
    );

    const ordersByStatus = await db.all(
      `SELECT status, COUNT(*) as count
       FROM ${ORDERS_TABLE}
       GROUP BY status`
    );

    const totalRevenue = await db.get(
      `SELECT SUM(total) as total FROM ${ORDERS_TABLE}`
    );

    const avgOrderValue = await db.get(
      `SELECT AVG(total) as average FROM ${ORDERS_TABLE}`
    );

    return res.json({
      success: true,
      data: {
        totalOrders: Number(totalOrders?.count || 0),
        ordersByStatus: ordersByStatus.reduce((acc, row) => {
          acc[row.status] = Number(row.count || 0);
          return acc;
        }, {}),
        totalRevenue: Number(totalRevenue?.total || 0),
        averageOrderValue: Number(avgOrderValue?.average || 0)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب الإحصائيات'
    });
  }
});

/**
 * GET /api/orders/track/:orderNumber
 */
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await getOrderByNumberWithItems(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    return res.json({
      success: true,
      data: {
        ...order,
        statusLabel: HELPERS.getStatusLabel(order.status),
        statusColor: HELPERS.getStatusColor(order.status)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في تتبع الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تتبع الطلب'
    });
  }
});

/**
 * POST /api/orders/:id/duplicate
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const duplicated = await duplicateOrderById(req.params.id);

    if (!duplicated) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    return res.json({
      success: true,
      message: 'تم نسخ الطلب بنجاح',
      data: duplicated
    });
  } catch (error) {
    console.error('❌ خطأ في نسخ الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في نسخ الطلب'
    });
  }
});

/**
 * PUT /api/orders/:id/customer
 */
router.put('/:id/customer', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (customerName !== undefined) {
      const value = safeText(customerName);
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'اسم العميل غير صحيح'
        });
      }
      updateFields.push('customer_name = ?');
      updateValues.push(value);
    }

    if (customerEmail !== undefined) {
      const value = safeText(customerEmail);
      if (!HELPERS.validateEmail(value)) {
        return res.status(400).json({
          success: false,
          error: 'البريد الإلكتروني غير صحيح'
        });
      }
      updateFields.push('customer_email = ?');
      updateValues.push(value);
    }

    if (customerPhone !== undefined) {
      const value = safeText(customerPhone);
      if (!HELPERS.validateKuwaitiPhone(value)) {
        return res.status(400).json({
          success: false,
          error: 'رقم الهاتف غير صحيح'
        });
      }
      updateFields.push('customer_phone = ?');
      updateValues.push(value);
    }

    if (!updateFields.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات لتحديث العميل'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم تحديث بيانات العميل بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث بيانات العميل:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث بيانات العميل'
    });
  }
});

/**
 * PUT /api/orders/:id/shipping
 */
router.put('/:id/shipping', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerAddress,
      customerCity,
      customerDistrict,
      shippingCost,
      fulfillmentLocation
    } = req.body;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (customerAddress !== undefined) {
      const value = safeText(customerAddress);
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'العنوان غير صحيح'
        });
      }
      updateFields.push('customer_address = ?');
      updateValues.push(value);
    }

    if (customerCity !== undefined) {
      updateFields.push('customer_city = ?');
      updateValues.push(safeText(customerCity));
    }

    if (customerDistrict !== undefined) {
      updateFields.push('customer_district = ?');
      updateValues.push(safeText(customerDistrict));
    }

    if (shippingCost !== undefined) {
      const finalShipping = Math.max(0, toNumber(shippingCost, 0));
      const subtotal = toNumber(order.subtotal, 0);
      const discountAmount = toNumber(order.discount_amount, 0);
      const newTotal = Math.max(0, subtotal - discountAmount + finalShipping);

      updateFields.push('shipping_cost = ?');
      updateValues.push(finalShipping);

      updateFields.push('total = ?');
      updateValues.push(newTotal);
    }

    if (!updateFields.length && fulfillmentLocation === undefined) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات لتحديث الشحن'
      });
    }

    if (updateFields.length) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      await db.run(
        `UPDATE ${ORDERS_TABLE}
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      );
    }

    if (fulfillmentLocation !== undefined) {
      await updateOrderNotesMeta(id, (meta) => ({
        ...meta,
        fulfillment_location: safeText(fulfillmentLocation)
      }));
    }

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم تحديث بيانات الشحن بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الشحن:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث بيانات الشحن'
    });
  }
});

/**
 * PUT /api/orders/:id/notes
 */
router.put('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const parsed = parseNotesAndMeta(order.notes);

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [buildNotesWithMeta(notes || '', parsed.meta), id]
    );

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم تحديث الملاحظات بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الملاحظات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث الملاحظات'
    });
  }
});

/**
 * POST /api/orders/:id/mark-paid
 */
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.COMPLETED, id]
    );

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم تعليم الطلب كمدفوع',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تعليم الطلب كمدفوع:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة الدفع'
    });
  }
});

/**
 * POST /api/orders/:id/fulfill
 */
router.post('/:id/fulfill', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET status = ?, shipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.SHIPPED, id]
    );

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      fulfillment_requested: false
    }));

    return res.json({
      success: true,
      message: 'تم تنفيذ الطلب بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تنفيذ الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تنفيذ الطلب'
    });
  }
});

/**
 * POST /api/orders/:id/request-fulfillment
 */
router.post('/:id/request-fulfillment', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      fulfillment_requested: true
    }));

    return res.json({
      success: true,
      message: 'تم إرسال طلب التنفيذ',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في طلب التنفيذ:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في طلب التنفيذ'
    });
  }
});

/**
 * POST /api/orders/:id/cancel-fulfillment-request
 */
router.post('/:id/cancel-fulfillment-request', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      fulfillment_requested: false
    }));

    return res.json({
      success: true,
      message: 'تم إلغاء طلب التنفيذ',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إلغاء طلب التنفيذ:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إلغاء طلب التنفيذ'
    });
  }
});

/**
 * PUT /api/orders/:id/fulfillment-location
 */
router.put('/:id/fulfillment-location', async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      fulfillment_location: safeText(location)
    }));

    return res.json({
      success: true,
      message: 'تم تحديث موقع التنفيذ',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث موقع التنفيذ:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث موقع التنفيذ'
    });
  }
});

/**
 * POST /api/orders/:id/archive
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const previousStatus = safeText(order.status) || SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING;

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
    );

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      archived: true,
      archived_prev_status: previousStatus
    }));

    return res.json({
      success: true,
      message: 'تم أرشفة الطلب',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في أرشفة الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في أرشفة الطلب'
    });
  }
});

/**
 * POST /api/orders/:id/unarchive
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await getOrderWithItems(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const restoredStatus = normalizeStatus(
      order.archived_prev_status || SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING
    );

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [restoredStatus, id]
    );

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      archived: false,
      archived_prev_status: null
    }));

    return res.json({
      success: true,
      message: 'تم إلغاء أرشفة الطلب',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إلغاء أرشفة الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إلغاء أرشفة الطلب'
    });
  }
});

/**
 * POST /api/orders/:id/cancel
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
    );

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم إلغاء الطلب',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إلغاء الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إلغاء الطلب'
    });
  }
});

/**
 * POST /api/orders/:id/restock
 */
router.post('/:id/restock', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      restocked: true
    }));

    return res.json({
      success: true,
      message: 'تم تسجيل إعادة التخزين',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إعادة التخزين:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إعادة التخزين'
    });
  }
});

/**
 * POST /api/orders/:id/return
 */
router.post('/:id/return', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      returned: true
    }));

    return res.json({
      success: true,
      message: 'تم تسجيل المرتجع',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل المرتجع:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تسجيل المرتجع'
    });
  }
});

/**
 * POST /api/orders/:id/send-invoice
 */
router.post('/:id/send-invoice', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      invoice_sent_at: new Date().toISOString()
    }));

    return res.json({
      success: true,
      message: 'تم تسجيل إرسال الفاتورة',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في إرسال الفاتورة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إرسال الفاتورة'
    });
  }
});

/**
 * PUT /api/orders/:id/tags
 */
router.put('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'set', tags = [] } = req.body;

    const order = await ensureOrderExists(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const parsed = parseNotesAndMeta(order.notes);
    const incomingTags = Array.isArray(tags)
      ? tags.map(tag => safeText(tag)).filter(Boolean)
      : String(tags || '')
          .split(',')
          .map(tag => safeText(tag))
          .filter(Boolean);

    let nextTags = [...parsed.meta.tags];

    if (mode === 'add') {
      nextTags = Array.from(new Set([...nextTags, ...incomingTags]));
    } else if (mode === 'remove') {
      const removeSet = new Set(incomingTags.map(tag => tag.toLowerCase()));
      nextTags = nextTags.filter(tag => !removeSet.has(tag.toLowerCase()));
    } else {
      nextTags = Array.from(new Set(incomingTags));
    }

    const updatedOrder = await updateOrderNotesMeta(id, (meta) => ({
      ...meta,
      tags: nextTags
    }));

    return res.json({
      success: true,
      message: 'تم تحديث الوسوم بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الوسوم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث الوسوم بنجاح'
    });
  }
});

/**
 * POST /api/orders/bulk/status
 */
router.post('/bulk/status', async (req, res) => {
  try {
    const { ids = [], status } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الطلبات'
      });
    }

    if (!isValidOrderStatus(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة الطلب غير صحيحة'
      });
    }

    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!id) continue;

      const order = await ensureOrderExists(id);
      if (!order) continue;

      const updateParts = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const values = [status];

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.SHIPPED) {
        updateParts.push('shipped_at = CURRENT_TIMESTAMP');
      }

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.COMPLETED) {
        updateParts.push('completed_at = CURRENT_TIMESTAMP');
      }

      values.push(id);

      await db.run(
        `UPDATE ${ORDERS_TABLE}
         SET ${updateParts.join(', ')}
         WHERE id = ?`,
        values
      );
    }

    return res.json({
      success: true,
      message: 'تم تحديث حالة الطلبات المحددة'
    });
  } catch (error) {
    console.error('❌ خطأ في التحديث الجماعي للحالة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في التحديث الجماعي للحالة'
    });
  }
});

/**
 * POST /api/orders/bulk/archive
 */
router.post('/bulk/archive', async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الطلبات'
      });
    }

    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!id) continue;

      const order = await ensureOrderExists(id);
      if (!order) continue;

      await db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
      );

      await updateOrderNotesMeta(id, (meta) => ({
        ...meta,
        archived: true,
        archived_prev_status: safeText(order.status) || SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING
      }));
    }

    return res.json({
      success: true,
      message: 'تم أرشفة الطلبات المحددة'
    });
  } catch (error) {
    console.error('❌ خطأ في الأرشفة الجماعية:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في الأرشفة الجماعية'
    });
  }
});

/**
 * POST /api/orders/bulk/unarchive
 */
router.post('/bulk/unarchive', async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الطلبات'
      });
    }

    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!id) continue;

      const order = await getOrderWithItems(id);
      if (!order) continue;

      await db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          normalizeStatus(order.archived_prev_status || SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING),
          id
        ]
      );

      await updateOrderNotesMeta(id, (meta) => ({
        ...meta,
        archived: false,
        archived_prev_status: null
      }));
    }

    return res.json({
      success: true,
      message: 'تم إلغاء أرشفة الطلبات المحددة'
    });
  } catch (error) {
    console.error('❌ خطأ في إلغاء الأرشفة الجماعية:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إلغاء الأرشفة الجماعية'
    });
  }
});

/**
 * POST /api/orders/bulk/cancel
 */
router.post('/bulk/cancel', async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الطلبات'
      });
    }

    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!id) continue;

      const order = await ensureOrderExists(id);
      if (!order) continue;

      await db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
      );
    }

    return res.json({
      success: true,
      message: 'تم إلغاء الطلبات المحددة'
    });
  } catch (error) {
    console.error('❌ خطأ في الإلغاء الجماعي:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في الإلغاء الجماعي'
    });
  }
});

/**
 * POST /api/orders/bulk/tags
 */
router.post('/bulk/tags', async (req, res) => {
  try {
    const { ids = [], mode = 'add', tags = [] } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الطلبات'
      });
    }

    const incomingTags = Array.isArray(tags)
      ? tags.map(tag => safeText(tag)).filter(Boolean)
      : String(tags || '')
          .split(',')
          .map(tag => safeText(tag))
          .filter(Boolean);

    for (const rawId of ids) {
      const id = String(rawId).trim();
      if (!id) continue;

      const order = await ensureOrderExists(id);
      if (!order) continue;

      await updateOrderNotesMeta(id, (meta) => {
        let nextTags = [...meta.tags];

        if (mode === 'remove') {
          const removeSet = new Set(incomingTags.map(tag => tag.toLowerCase()));
          nextTags = nextTags.filter(tag => !removeSet.has(tag.toLowerCase()));
        } else {
          nextTags = Array.from(new Set([...nextTags, ...incomingTags]));
        }

        return {
          ...meta,
          tags: nextTags
        };
      });
    }

    return res.json({
      success: true,
      message: 'تم تحديث وسوم الطلبات المحددة'
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الوسوم جماعيًا:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث الوسوم جماعيًا'
    });
  }
});

/**
 * PUT /api/orders/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      notes,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerDistrict,
      shippingCost,
      items,
      tags,
      fulfillmentRequested,
      fulfillmentLocation,
      archived
    } = req.body;

    const order = await db.get(
      `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const parsedMeta = parseNotesAndMeta(order.notes);

    const updateFields = [];
    const updateValues = [];

    if (status !== undefined) {
      if (!isValidOrderStatus(status)) {
        return res.status(400).json({
          success: false,
          error: 'حالة الطلب غير صحيحة'
        });
      }

      updateFields.push('status = ?');
      updateValues.push(status);

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.SHIPPED) {
        updateFields.push('shipped_at = CURRENT_TIMESTAMP');
      }

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.COMPLETED) {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }
    }

    if (customerName !== undefined) {
      const value = safeText(customerName);
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'اسم العميل غير صحيح'
        });
      }
      updateFields.push('customer_name = ?');
      updateValues.push(value);
    }

    if (customerEmail !== undefined) {
      const value = safeText(customerEmail);
      if (!HELPERS.validateEmail(value)) {
        return res.status(400).json({
          success: false,
          error: 'البريد الإلكتروني غير صحيح'
        });
      }
      updateFields.push('customer_email = ?');
      updateValues.push(value);
    }

    if (customerPhone !== undefined) {
      const value = safeText(customerPhone);
      if (!HELPERS.validateKuwaitiPhone(value)) {
        return res.status(400).json({
          success: false,
          error: 'رقم الهاتف غير صحيح'
        });
      }
      updateFields.push('customer_phone = ?');
      updateValues.push(value);
    }

    if (customerAddress !== undefined) {
      const value = safeText(customerAddress);
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'العنوان غير صحيح'
        });
      }
      updateFields.push('customer_address = ?');
      updateValues.push(value);
    }

    if (customerCity !== undefined) {
      updateFields.push('customer_city = ?');
      updateValues.push(safeText(customerCity));
    }

    if (customerDistrict !== undefined) {
      updateFields.push('customer_district = ?');
      updateValues.push(safeText(customerDistrict));
    }

    let finalShipping = shippingCost !== undefined
      ? Math.max(0, toNumber(shippingCost, 0))
      : toNumber(order.shipping_cost, 0);

    let finalSubtotal = toNumber(order.subtotal, 0);
    let finalDiscountAmount = toNumber(order.discount_amount, 0);
    let shouldReplaceItems = false;
    let normalizedItems = [];

    if (items !== undefined) {
      normalizedItems = normalizeOrderItems(items);

      if (!normalizedItems.length) {
        return res.status(400).json({
          success: false,
          error: 'يجب أن يحتوي الطلب على منتج واحد على الأقل'
        });
      }

      finalSubtotal = calculateSubtotal(normalizedItems);
      shouldReplaceItems = true;
    }

    if (shippingCost !== undefined || items !== undefined) {
      updateFields.push('subtotal = ?');
      updateValues.push(finalSubtotal);

      updateFields.push('shipping_cost = ?');
      updateValues.push(finalShipping);

      updateFields.push('total = ?');
      updateValues.push(Math.max(0, finalSubtotal - finalDiscountAmount + finalShipping));
    }

    const nextMeta = {
      ...parsedMeta.meta,
      tags: tags !== undefined
        ? (Array.isArray(tags)
            ? tags.map(tag => safeText(tag)).filter(Boolean)
            : String(tags || '').split(',').map(tag => safeText(tag)).filter(Boolean))
        : parsedMeta.meta.tags,
      fulfillment_requested: fulfillmentRequested !== undefined
        ? Boolean(fulfillmentRequested)
        : parsedMeta.meta.fulfillment_requested,
      fulfillment_location: fulfillmentLocation !== undefined
        ? safeText(fulfillmentLocation)
        : parsedMeta.meta.fulfillment_location,
      archived: archived !== undefined
        ? Boolean(archived)
        : parsedMeta.meta.archived,
      archived_prev_status: parsedMeta.meta.archived_prev_status,
      restocked: parsedMeta.meta.restocked,
      returned: parsedMeta.meta.returned,
      invoice_sent_at: parsedMeta.meta.invoice_sent_at
    };

    if (notes !== undefined || tags !== undefined || fulfillmentRequested !== undefined || fulfillmentLocation !== undefined || archived !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(buildNotesWithMeta(
        notes !== undefined ? notes : parsedMeta.visibleNotes,
        nextMeta
      ));
    }

    if (!updateFields.length && !shouldReplaceItems) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(
      `UPDATE ${ORDERS_TABLE}
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    if (shouldReplaceItems) {
      await replaceOrderItems(id, normalizedItems);
    }

    const updatedOrder = await getOrderWithItems(id);

    return res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث الطلب'
    });
  }
});

/**
 * DELETE /api/orders/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.get(
      `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await db.run(
      `DELETE FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
      [id]
    );

    await db.run(
      `DELETE FROM ${ORDERS_TABLE} WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'تم حذف الطلب بنجاح',
      data: {
        deletedOrderNumber: order.order_number,
        deletedOrderId: order.id
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف الطلب'
    });
  }
});

/**
 * GET /api/orders/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await getOrderWithItems(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلب:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب الطلب'
    });
  }
});

/**
 * GET /api/orders
 * يدعم الآن:
 * - status
 * - search
 * - limit
 * - offset
 * - sort
 * - order
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      search = '',
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const parsedLimit = Math.max(1, toInt(limit, 50));
    const parsedOffset = Math.max(0, toInt(offset, 0));
    const validSortColumns = ['created_at', 'updated_at', 'total', 'order_number', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `SELECT * FROM ${ORDERS_TABLE}`;
    const params = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    const orders = await db.all(sql, params);
    const merged = orders.map(mergeOrderMeta);
    const filtered = applySearchFilterLocally(merged, search);
    const paginated = filtered.slice(parsedOffset, parsedOffset + parsedLimit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        total: filtered.length,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(filtered.length / parsedLimit)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب الطلبات'
    });
  }
});

module.exports = router;