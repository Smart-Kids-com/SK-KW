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

    // التحقق من البيانات المطلوبة
    if (!customerName || !customerEmail || !customerPhone || !customerAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة ناقصة'
      });
    }

    // التحقق من صحة البريد الإلكتروني
    if (!HELPERS.validateEmail(customerEmail)) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني غير صحيح'
      });
    }

    // التحقق من صحة رقم الهاتف
    if (!HELPERS.validateKuwaitiPhone(customerPhone)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف غير صحيح'
      });
    }

    // حساب الإجمالي
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    const shippingCost = HELPERS.calculateShipping(subtotal);
    const total = subtotal + shippingCost;
    const orderNumber = HELPERS.generateOrderNumber();

    // إنشاء الطلب داخل transaction
    await db.transaction(async () => {
      // إدراج الطلب الرئيسي
      const result = await db.run(
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

      const orderId = result.id;

      // إدراج عناصر الطلب
      for (const item of items) {
        await db.run(
          `INSERT INTO ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS}
          (order_id, product_id, product_name, price, quantity)
          VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId || `product_${Date.now()}`,
            item.name,
            item.price,
            item.quantity
          ]
        );
      }

      return orderId;
    });

    // جلب الطلب الجديد مع عناصره
    const newOrder = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE order_number = ?`,
      [orderNumber]
    );

    const orderItems = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} WHERE order_id = ?`,
      [newOrder.id]
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: {
        ...newOrder,
        items: orderItems
      }
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الطلب'
    });
  }
});

/**
 * ⚠️ SPECIFIC ROUTES MUST COME BEFORE GENERIC :id ROUTE
 * GET /api/orders/stats/summary - جلب الإحصائيات
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // إجمالي الطلبات
    const totalOrders = await db.get(
      `SELECT COUNT(*) as count FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
    );

    // الطلبات حسب الحالة
    const ordersByStatus = await db.all(
      `SELECT status, COUNT(*) as count FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} GROUP BY status`
    );

    // إجمالي المبيعات
    const totalRevenue = await db.get(
      `SELECT SUM(total) as total FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
    );

    // متوسط قيمة الطلب
    const avgOrderValue = await db.get(
      `SELECT AVG(total) as average FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`
    );

    res.json({
      success: true,
      data: {
        totalOrders: totalOrders.count,
        ordersByStatus: ordersByStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {}),
        totalRevenue: totalRevenue.total || 0,
        averageOrderValue: avgOrderValue.average || 0
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    res.status(500).json({
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
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE order_number = ?`,
      [orderNumber]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    const items = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} WHERE order_id = ?`,
      [order.id]
    );

    res.json({
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
    res.status(500).json({
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

    // التحقق من وجود الطلب
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

    // بناء الاستعلام الديناميكي
    let updateFields = [];
    let updateValues = [];

    if (status) {
      // التحقق من أن الحالة صحيحة
      if (!Object.values(SYSTEM_CONFIG.ORDER_CONFIG.STATUSES).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'حالة الطلب غير صحيحة'
        });
      }
      updateFields.push('status = ?');
      updateValues.push(status);

      // إذا تم تعديل الحالة إلى مشحون أو مكتمل، تسجيل الوقت
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

    // تحديث وقت التعديل
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateValues.push(id);

    // تنفيذ التحديث
    await db.run(
      `UPDATE ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // جلب الطلب المحدث
    const updatedOrder = await db.get(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    const items = await db.all(
      `SELECT * FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDER_ITEMS} WHERE order_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      data: {
        ...updatedOrder,
        items
      }
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث الطلب:', error);
    res.status(500).json({
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

    // التحقق من وجود الطلب
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

    // حذف الطلب وعناصره (العناصر تُحذف تلقائياً بسبب CASCADE)
    await db.run(
      `DELETE FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS} WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'تم حذف الطلب بنجاح',
      data: {
        deletedOrderNumber: order.order_number,
        deletedOrderId: order.id
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
    res.status(500).json({
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

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلب:', error);
    res.status(500).json({
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

    // تطبيق التصفية حسب الحالة
    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    // ترتيب النتائج
    const validSortColumns = ['created_at', 'updated_at', 'total', 'order_number', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // تطبيق الحد والإزاحة (pagination)
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const orders = await db.all(sql, params);

    // الحصول على عدد الطلبات الكلي
    let countSql = `SELECT COUNT(*) as total FROM ${SYSTEM_CONFIG.DATABASE_CONFIG.TABLES.ORDERS}`;
    let countParams = [];
    if (status) {
      countSql += ` WHERE status = ?`;
      countParams.push(status);
    }
    const countResult = await db.get(countSql, countParams);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الطلبات'
    });
  }
});

module.exports = router;
