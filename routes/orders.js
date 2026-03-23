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
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // تطبيق الحد والإزاحة (pagination)
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

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
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        totalPages: Math.ceil(countResult.total / parseInt(limit, 10))
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