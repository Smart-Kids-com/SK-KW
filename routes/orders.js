// routes/orders.js - API endpoints لإدارة الطلبات
// ⚠️ IMPORTANT: Route order matters in Express!
// More specific routes MUST come before generic routes.
// ORDER: POST/PUT/DELETE → specific GET paths → generic GET :id → GET /

const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');
const { SYSTEM_CONFIG, HELPERS } = require('../config/system');

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
    items.forEach(item => {
      subtotal += Number(item.price || 0) * Number(item.quantity || 1);
    });

    const shippingCost = HELPERS.calculateShipping(subtotal);
    const total = subtotal + shippingCost;
    const orderNumber = HELPERS.generateOrderNumber();

    // 1) احفظ الطلب الرئيسي أولًا بدون الاعتماد على lastInsertRowid
    await db.run(
      `INSERT INTO ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}
      (order_number, customer_name, customer_email, customer_phone, customer_address,
       customer_city, customer_district, subtotal, shipping_cost, total, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
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
    );

    // 2) هات الـ id الحقيقي باستخدام order_number
    const savedOrder = await db.get(
      `SELECT id
       FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}
       WHERE order_number = ?
       ORDER BY id DESC
       LIMIT 1`,
      [orderNumber]
    );

    if (!savedOrder || !savedOrder.id) {
      return res.status(500).json({
        success: false,
        error: 'فشل في استخراج معرف الطلب'
      });
    }

    const savedOrderId = savedOrder.id;

    // 3) احفظ عناصر الطلب
    for (const item of items) {
      await db.run(
        `INSERT INTO ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}
        (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)`,
        [
          savedOrderId,
          item.productId || `product_${Date.now()}`,
          item.name || 'منتج',
          Number(item.price || 0),
          Number(item.quantity || 1)
        ]
      );
    }

    // 4) نجاح مباشر
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: {
        id: savedOrderId,
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_city: customerCity || 'الكويت',
        customer_district: customerDistrict || '',
        subtotal,
        shipping_cost: shippingCost,
        total,
        status: SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.PENDING,
        notes: notes || ''
      }
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
 * GET /api/orders/stats/summary - جلب الإحصائيات
 * ⚠️ MUST COME BEFORE GET /:id
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalOrders = await db.get(
      `SELECT COUNT(*) as count FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
    );

    const ordersByStatus = await db.all(
      `SELECT status, COUNT(*) as count
       FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}
       GROUP BY status`
    );

    const totalRevenue = await db.get(
      `SELECT SUM(total) as total FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
    );

    const avgOrderValue = await db.get(
      `SELECT AVG(total) as average FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
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
 * GET /api/orders/track/:orderNumber - تتبع الطلب برقمه
 * ⚠️ MUST COME BEFORE GET /:id
 */
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}
       WHERE order_number = ?`,
      [orderNumber]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const items = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}
       WHERE order_id = ?`,
      [order.id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items,
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
 * PUT /api/orders/:id - تحديث الطلب
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, customerEmail, customerPhone, customerAddress } = req.body;

    const order = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    let updateFields = [];
    let updateValues = [];

    if (status) {
      if (!Object.values(SYSTEM_CONFIG.ORDER_CONFIG.STATUSES).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'حالة الطلب غير صحيحة'
        });
      }

      updateFields.push('status = ?');
      updateValues.push(status);

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.SHIPPED && !order.shipped_at) {
        updateFields.push('shipped_at = CURRENT_TIMESTAMP');
      }

      if (status === SYSTEM_CONFIG.ORDER_CONFIG.STATUSES.COMPLETED && !order.completed_at) {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (customerEmail) {
      if (!HELPERS.validateEmail(customerEmail)) {
        return res.status(400).json({
          success: false,
          error: 'البريد الإلكتروني غير صحيح'
        });
      }
      updateFields.push('customer_email = ?');
      updateValues.push(customerEmail);
    }

    if (customerPhone) {
      if (!HELPERS.validateKuwaitiPhone(customerPhone)) {
        return res.status(400).json({
          success: false,
          error: 'رقم الهاتف غير صحيح'
        });
      }
      updateFields.push('customer_phone = ?');
      updateValues.push(customerPhone);
    }

    if (customerAddress) {
      updateFields.push('customer_address = ?');
      updateValues.push(customerAddress);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateValues.push(id);

    await db.run(
      `UPDATE ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    const updatedOrder = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    const items = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} WHERE order_id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      data: {
        ...updatedOrder,
        items
      }
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

    const order = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    await db.run(
      `DELETE FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
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
 * GET /api/orders/:id - الحصول على تفاصيل طلب واحد
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const items = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} WHERE order_id = ?`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items
      }
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
  try {
    const { status, limit = 50, offset = 0, sort = 'created_at', order = 'DESC' } = req.query;

    let sql = `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`;
    let params = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    const validSortColumns = ['created_at', 'updated_at', 'total', 'order_number', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const orders = await db.all(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`;
    let countParams = [];
    if (status) {
      countSql += ` WHERE status = ?`;
      countParams.push(status);
    }

    const countResult = await db.get(countSql, countParams);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total: Number(countResult?.total || 0),
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        totalPages: Math.ceil(Number(countResult?.total || 0) / parseInt(limit, 10))
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