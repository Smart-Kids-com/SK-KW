// routes/orders.js - API endpoints لإدارة الطلبات
// IMPORTANT: Route order matters in Express
// ORDER: POST/PUT/DELETE → specific GET paths → generic GET :id → GET /

const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');
const { SYSTEM_CONFIG, HELPERS } = require('../config/system');

const ORDERS_TABLE = SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS;
const ORDER_ITEMS_TABLE = SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS;

const MAX_LIST_LIMIT = 50;
const QUERY_TIMEOUT_MS = 10000;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toSafeInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseListParams(query = {}) {
  const rawLimit = toSafeInt(query.limit, 50);
  const rawOffset = toSafeInt(query.offset, 0);

  return {
    status: query.status,
    sort: query.sort || 'created_at',
    order: query.order || 'DESC',
    limit: clamp(rawLimit, 1, MAX_LIST_LIMIT),
    offset: Math.max(rawOffset, 0)
  };
}

function isValidOrderStatus(status) {
  return Object.values(SYSTEM_CONFIG.ORDER_CONFIG.STATUSES).includes(status);
}

function withTimeout(promise, label = 'query', timeoutMs = QUERY_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

async function getOrderWithItems(id) {
  const order = await withTimeout(
    db.get(
      `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
      [id]
    ),
    'getOrderWithItems:order'
  );

  if (!order) return null;

  const items = await withTimeout(
    db.all(
      `SELECT * FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
      [id]
    ),
    'getOrderWithItems:items'
  );

  return {
    ...order,
    items
  };
}

async function getOrderByNumberWithItems(orderNumber) {
  const order = await withTimeout(
    db.get(
      `SELECT * FROM ${ORDERS_TABLE} WHERE order_number = ?`,
      [orderNumber]
    ),
    'getOrderByNumberWithItems:order'
  );

  if (!order) return null;

  const items = await withTimeout(
    db.all(
      `SELECT * FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
      [order.id]
    ),
    'getOrderByNumberWithItems:items'
  );

  return {
    ...order,
    items
  };
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const quantity = Math.max(1, toNumber(item.quantity, 1));
      const price = Math.max(0, toNumber(item.price, 0));

      const productName = String(
        item.product_name ||
        item.name ||
        item.title ||
        `منتج ${index + 1}`
      ).trim();

      const productId = String(
        item.product_id ||
        item.productId ||
        `manual_${Date.now()}_${index}`
      ).trim();

      const productImage = String(
        item.product_image ||
        item.image ||
        item.image_url ||
        ''
      ).trim();

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
  await withTimeout(
    db.run(
      `DELETE FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`,
      [orderId]
    ),
    'replaceOrderItems:delete'
  );

  for (const item of items) {
    await withTimeout(
      db.run(
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
      ),
      'replaceOrderItems:insert'
    );
  }
}

/**
 * POST /api/orders - إنشاء طلب جديد
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
      notes
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

    let subtotal = 0;
    for (const item of items) {
      subtotal += toNumber(item.price, 0) * toNumber(item.quantity, 1);
    }

    const shippingCost = HELPERS.calculateShipping(subtotal);
    const total = subtotal + shippingCost;
    const tempOrderNumber = `TEMP-${Date.now()}`;

    await withTimeout(
      db.run(
        `INSERT INTO ${ORDERS_TABLE}
        (order_number, customer_name, customer_email, customer_phone, customer_address,
         customer_city, customer_district, subtotal, shipping_cost, total, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tempOrderNumber,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity || 'الكويت',
          customerDistrict || '',
          subtotal,
          shippingCost,
          total,
          SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING,
          notes || ''
        ]
      ),
      'createOrder:insertOrder'
    );

    const savedOrder = await withTimeout(
      db.get(
        `SELECT id
         FROM ${ORDERS_TABLE}
         WHERE order_number = ?
         ORDER BY id DESC
         LIMIT 1`,
        [tempOrderNumber]
      ),
      'createOrder:getSavedOrder'
    );

    if (!savedOrder || !savedOrder.id) {
      return res.status(500).json({
        success: false,
        error: 'فشل في استخراج معرف الطلب'
      });
    }

    const savedOrderId = savedOrder.id;
    const SHOPIFY_LAST_ORDER = 4060;
    const nextOrderNumber = `SK${SHOPIFY_LAST_ORDER + savedOrderId}`;

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET order_number = ?
         WHERE id = ?`,
        [nextOrderNumber, savedOrderId]
      ),
      'createOrder:updateOrderNumber'
    );

    for (const item of items) {
      await withTimeout(
        db.run(
          `INSERT INTO ${ORDER_ITEMS_TABLE}
          (order_id, product_id, product_name, product_image, price, quantity)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            savedOrderId,
            item.productId || `product_${Date.now()}`,
            item.name || 'منتج',
            item.image || item.image_url || '',
            toNumber(item.price, 0),
            toNumber(item.quantity, 1)
          ]
        ),
        'createOrder:insertItem'
      );
    }

    const createdOrder = await getOrderWithItems(savedOrderId);

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
 * MUST COME BEFORE GET /:id
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalOrders = await withTimeout(
      db.get(`SELECT COUNT(*) as count FROM ${ORDERS_TABLE}`),
      'stats:totalOrders'
    );

    const ordersByStatus = await withTimeout(
      db.all(
        `SELECT status, COUNT(*) as count
         FROM ${ORDERS_TABLE}
         GROUP BY status`
      ),
      'stats:ordersByStatus'
    );

    const totalRevenue = await withTimeout(
      db.get(`SELECT SUM(total) as total FROM ${ORDERS_TABLE}`),
      'stats:totalRevenue'
    );

    const avgOrderValue = await withTimeout(
      db.get(`SELECT AVG(total) as average FROM ${ORDERS_TABLE}`),
      'stats:avgOrderValue'
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
 * MUST COME BEFORE GET /:id
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
 * PUT /api/orders/:id/customer
 * تعديل بيانات العميل
 */
router.put('/:id/customer', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'updateCustomer:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (customerName !== undefined) {
      const value = String(customerName || '').trim();
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
      const value = String(customerEmail || '').trim();
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
      const value = String(customerPhone || '').trim();
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

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      'updateCustomer:updateOrder'
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
 * تعديل العنوان والشحن
 */
router.put('/:id/shipping', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerAddress,
      customerCity,
      customerDistrict,
      shippingCost
    } = req.body;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'updateShipping:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (customerAddress !== undefined) {
      const value = String(customerAddress || '').trim();
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
      updateValues.push(String(customerCity || '').trim());
    }

    if (customerDistrict !== undefined) {
      updateFields.push('customer_district = ?');
      updateValues.push(String(customerDistrict || '').trim());
    }

    if (shippingCost !== undefined) {
      const finalShipping = toNumber(shippingCost, 0);
      const subtotal = toNumber(order.subtotal, 0);
      const newTotal = subtotal + finalShipping;

      updateFields.push('shipping_cost = ?');
      updateValues.push(finalShipping);

      updateFields.push('total = ?');
      updateValues.push(newTotal);
    }

    if (!updateFields.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات لتحديث الشحن'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      'updateShipping:updateOrder'
    );

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
 * تعديل الملاحظات
 */
router.put('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'updateNotes:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [notes || '', id]
      ),
      'updateNotes:updateOrder'
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
 * تعليم الطلب كمدفوع
 */
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'markPaid:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.COMPLETED, id]
      ),
      'markPaid:updateOrder'
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
 * تعليم الطلب كمنفذ / مشحون
 */
router.post('/:id/fulfill', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'fulfill:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, shipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.SHIPPED, id]
      ),
      'fulfill:updateOrder'
    );

    const updatedOrder = await getOrderWithItems(id);

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
 * POST /api/orders/:id/archive
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'archive:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
      ),
      'archive:updateOrder'
    );

    const updatedOrder = await getOrderWithItems(id);

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
 * POST /api/orders/:id/cancel
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'cancel:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.CANCELLED, id]
      ),
      'cancel:updateOrder'
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
 * PUT /api/orders/:id - تحديث عام للطلب
 * يدعم الآن:
 * - status
 * - notes
 * - customer fields
 * - shipping fields
 * - items
 * - subtotal / total recalculation
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
      items
    } = req.body;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'updateOrder:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

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

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes || '');
    }

    if (customerName !== undefined) {
      const value = String(customerName || '').trim();
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
      const value = String(customerEmail || '').trim();
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
      const value = String(customerPhone || '').trim();
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
      const value = String(customerAddress || '').trim();
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
      updateValues.push(String(customerCity || '').trim());
    }

    if (customerDistrict !== undefined) {
      updateFields.push('customer_district = ?');
      updateValues.push(String(customerDistrict || '').trim());
    }

    let finalShipping = shippingCost !== undefined
      ? Math.max(0, toNumber(shippingCost, 0))
      : toNumber(order.shipping_cost, 0);

    let finalSubtotal = toNumber(order.subtotal, 0);
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
      updateValues.push(finalSubtotal + finalShipping);
    }

    if (!updateFields.length && !shouldReplaceItems) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await withTimeout(
      db.run(
        `UPDATE ${ORDERS_TABLE}
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      'updateOrder:updateMainOrder'
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
 * DELETE /api/orders/:id - حذف طلب
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await withTimeout(
      db.get(
        `SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'deleteOrder:getOrder'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await withTimeout(
      db.run(`DELETE FROM ${ORDER_ITEMS_TABLE} WHERE order_id = ?`, [id]),
      'deleteOrder:deleteItems'
    );

    await withTimeout(
      db.run(
        `DELETE FROM ${ORDERS_TABLE} WHERE id = ?`,
        [id]
      ),
      'deleteOrder:deleteOrder'
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
 * GET /api/orders/:id - الحصول على تفاصيل طلب واحد
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
 * GET /api/orders - جلب جميع الطلبات مع التصفية والترتيب
 */
router.get('/', async (req, res) => {
  const startedAt = Date.now();

  try {
    const {
      status,
      sort,
      order,
      limit,
      offset
    } = parseListParams(req.query);

    let sql = `SELECT * FROM ${ORDERS_TABLE}`;
    const params = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    const validSortColumns = ['created_at', 'updated_at', 'total', 'order_number', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    console.log('[orders:list] before db.all', {
      ms: Date.now() - startedAt,
      sortColumn,
      sortOrder,
      limit,
      offset,
      hasStatusFilter: !!status
    });

    const orders = await withTimeout(
      db.all(sql, params),
      'orders:list:db.all'
    );

    console.log('[orders:list] after db.all', {
      ms: Date.now() - startedAt,
      rows: Array.isArray(orders) ? orders.length : 0
    });

    let countSql = `SELECT COUNT(*) as total FROM ${ORDERS_TABLE}`;
    const countParams = [];

    if (status) {
      countSql += ` WHERE status = ?`;
      countParams.push(status);
    }

    console.log('[orders:list] before db.get(count)', {
      ms: Date.now() - startedAt
    });

    const countResult = await withTimeout(
      db.get(countSql, countParams),
      'orders:list:count'
    );

    console.log('[orders:list] after db.get(count)', {
      ms: Date.now() - startedAt,
      total: Number(countResult?.total || 0)
    });

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total: Number(countResult?.total || 0),
        limit,
        offset,
        totalPages: Math.ceil(Number(countResult?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', {
      message: error?.message,
      stack: error?.stack,
      ms: Date.now() - startedAt
    });

    return res.status(500).json({
      success: false,
      error: 'فشل في جلب الطلبات'
    });
  }
});

module.exports = router;