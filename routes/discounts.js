const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

const DISCOUNT_CODES_TABLE = 'discount_codes';

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

function normalizeCode(code = '') {
  return safeText(code).toUpperCase();
}

function normalizeDiscountType(type = '') {
  const value = safeText(type).toLowerCase();
  return ['fixed', 'percentage'].includes(value) ? value : '';
}

function normalizeBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;

  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return 1;
  if (['0', 'false', 'no', 'off'].includes(text)) return 0;

  return defaultValue ? 1 : 0;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeDateTime(value) {
  const text = safeText(value);
  if (!text) return null;

  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

function isDiscountCurrentlyValid(row) {
  if (!row) return { valid: false, reason: 'كود الخصم غير موجود' };

  if (!Number(row.is_active)) {
    return { valid: false, reason: 'كود الخصم غير مفعل' };
  }

  const now = Date.now();

  if (row.starts_at) {
    const startsAt = new Date(row.starts_at).getTime();
    if (Number.isFinite(startsAt) && now < startsAt) {
      return { valid: false, reason: 'كود الخصم لم يبدأ بعد' };
    }
  }

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at).getTime();
    if (Number.isFinite(expiresAt) && now > expiresAt) {
      return { valid: false, reason: 'انتهت صلاحية كود الخصم' };
    }
  }

  const usageLimit = row.usage_limit === null || row.usage_limit === undefined
    ? null
    : toInt(row.usage_limit, null);

  const usedCount = toInt(row.used_count, 0);

  if (usageLimit !== null && usedCount >= usageLimit) {
    return { valid: false, reason: 'تم الوصول إلى الحد الأقصى لاستخدام هذا الكود' };
  }

  return { valid: true, reason: '' };
}

function calculateDiscountAmount({ type, value, subtotal }) {
  const safeSubtotal = Math.max(0, toNumber(subtotal, 0));
  const safeValue = Math.max(0, toNumber(value, 0));

  if (safeSubtotal <= 0 || safeValue <= 0) return 0;

  if (type === 'percentage') {
    const amount = safeSubtotal * (safeValue / 100);
    return Math.max(0, Math.min(amount, safeSubtotal));
  }

  if (type === 'fixed') {
    return Math.max(0, Math.min(safeValue, safeSubtotal));
  }

  return 0;
}

function mapDiscountRow(row) {
  if (!row) return null;

  return {
    ...row,
    is_active: Number(row.is_active || 0),
    value: toNumber(row.value, 0),
    minimum_order_amount: toNumber(row.minimum_order_amount, 0),
    usage_limit: row.usage_limit === null || row.usage_limit === undefined ? null : toInt(row.usage_limit, null),
    used_count: toInt(row.used_count, 0)
  };
}

async function getDiscountById(id) {
  const row = await db.get(
    `SELECT * FROM ${DISCOUNT_CODES_TABLE} WHERE id = ?`,
    [id]
  );
  return mapDiscountRow(row);
}

async function getDiscountByCode(code) {
  const row = await db.get(
    `SELECT * FROM ${DISCOUNT_CODES_TABLE} WHERE UPPER(TRIM(code)) = ?`,
    [normalizeCode(code)]
  );
  return mapDiscountRow(row);
}

/**
 * POST /api/discounts/validate
 * body:
 * {
 *   code: "SMART10",
 *   subtotal: 147
 * }
 */
router.post('/validate', async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const subtotal = Math.max(0, toNumber(req.body?.subtotal, 0));

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'كود الخصم مطلوب'
      });
    }

    const discount = await getDiscountByCode(code);

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'كود الخصم غير موجود'
      });
    }

    const validity = isDiscountCurrentlyValid(discount);
    if (!validity.valid) {
      return res.status(400).json({
        success: false,
        error: validity.reason
      });
    }

    if (subtotal < toNumber(discount.minimum_order_amount, 0)) {
      return res.status(400).json({
        success: false,
        error: `الحد الأدنى للطلب لهذا الكود هو ${toNumber(discount.minimum_order_amount, 0).toFixed(3)}`
      });
    }

    const discountAmount = calculateDiscountAmount({
      type: discount.type,
      value: discount.value,
      subtotal
    });

    return res.json({
      success: true,
      message: 'كود الخصم صالح',
      data: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: toNumber(discount.value, 0),
        minimum_order_amount: toNumber(discount.minimum_order_amount, 0),
        discount_amount: discountAmount,
        subtotal,
        subtotal_after_discount: Math.max(0, subtotal - discountAmount)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في التحقق من كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في التحقق من كود الخصم'
    });
  }
});

/**
 * GET /api/discounts/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalRow = await db.get(
      `SELECT COUNT(*) as count FROM ${DISCOUNT_CODES_TABLE}`
    );

    const activeRow = await db.get(
      `SELECT COUNT(*) as count FROM ${DISCOUNT_CODES_TABLE} WHERE is_active = 1`
    );

    const inactiveRow = await db.get(
      `SELECT COUNT(*) as count FROM ${DISCOUNT_CODES_TABLE} WHERE is_active = 0`
    );

    return res.json({
      success: true,
      data: {
        totalDiscounts: toInt(totalRow?.count, 0),
        activeDiscounts: toInt(activeRow?.count, 0),
        inactiveDiscounts: toInt(inactiveRow?.count, 0)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الخصومات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات الخصومات'
    });
  }
});

/**
 * POST /api/discounts
 */
router.post('/', async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const type = normalizeDiscountType(req.body?.type);
    const value = Math.max(0, toNumber(req.body?.value, 0));
    const isActive = normalizeBooleanFlag(req.body?.is_active ?? req.body?.isActive, true);
    const minimumOrderAmount = Math.max(0, toNumber(req.body?.minimum_order_amount ?? req.body?.minimumOrderAmount, 0));
    const usageLimit = toNullableInt(req.body?.usage_limit ?? req.body?.usageLimit);
    const startsAt = normalizeDateTime(req.body?.starts_at ?? req.body?.startsAt);
    const expiresAt = normalizeDateTime(req.body?.expires_at ?? req.body?.expiresAt);
    const notes = safeText(req.body?.notes);

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'كود الخصم مطلوب'
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'نوع الخصم يجب أن يكون fixed أو percentage'
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        success: false,
        error: 'قيمة الخصم يجب أن تكون أكبر من صفر'
      });
    }

    if (startsAt && expiresAt && new Date(startsAt).getTime() > new Date(expiresAt).getTime()) {
      return res.status(400).json({
        success: false,
        error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
      });
    }

    const existing = await getDiscountByCode(code);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'كود الخصم موجود بالفعل'
      });
    }

    await db.run(
      `INSERT INTO ${DISCOUNT_CODES_TABLE}
      (
        code,
        type,
        value,
        is_active,
        minimum_order_amount,
        usage_limit,
        used_count,
        starts_at,
        expires_at,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        code,
        type,
        value,
        isActive,
        minimumOrderAmount,
        usageLimit,
        0,
        startsAt,
        expiresAt,
        notes
      ]
    );

    const created = await getDiscountByCode(code);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء كود الخصم بنجاح',
      data: created
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء كود الخصم'
    });
  }
});

/**
 * GET /api/discounts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const discount = await getDiscountById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'كود الخصم غير موجود'
      });
    }

    return res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    console.error('❌ خطأ في جلب كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب كود الخصم'
    });
  }
});

/**
 * PUT /api/discounts/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getDiscountById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'كود الخصم غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (req.body?.code !== undefined) {
      const code = normalizeCode(req.body.code);
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'كود الخصم غير صحيح'
        });
      }

      const existing = await getDiscountByCode(code);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).json({
          success: false,
          error: 'يوجد كود خصم آخر بنفس الاسم'
        });
      }

      updateFields.push('code = ?');
      updateValues.push(code);
    }

    if (req.body?.type !== undefined) {
      const type = normalizeDiscountType(req.body.type);
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'نوع الخصم يجب أن يكون fixed أو percentage'
        });
      }

      updateFields.push('type = ?');
      updateValues.push(type);
    }

    if (req.body?.value !== undefined) {
      const value = Math.max(0, toNumber(req.body.value, 0));
      if (value <= 0) {
        return res.status(400).json({
          success: false,
          error: 'قيمة الخصم يجب أن تكون أكبر من صفر'
        });
      }

      updateFields.push('value = ?');
      updateValues.push(value);
    }

    if (req.body?.is_active !== undefined || req.body?.isActive !== undefined) {
      const isActive = normalizeBooleanFlag(req.body?.is_active ?? req.body?.isActive, true);
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (req.body?.minimum_order_amount !== undefined || req.body?.minimumOrderAmount !== undefined) {
      const minimumOrderAmount = Math.max(0, toNumber(req.body?.minimum_order_amount ?? req.body?.minimumOrderAmount, 0));
      updateFields.push('minimum_order_amount = ?');
      updateValues.push(minimumOrderAmount);
    }

    if (req.body?.usage_limit !== undefined || req.body?.usageLimit !== undefined) {
      const usageLimit = toNullableInt(req.body?.usage_limit ?? req.body?.usageLimit);
      updateFields.push('usage_limit = ?');
      updateValues.push(usageLimit);
    }

    if (req.body?.used_count !== undefined || req.body?.usedCount !== undefined) {
      const usedCount = Math.max(0, toInt(req.body?.used_count ?? req.body?.usedCount, 0));
      updateFields.push('used_count = ?');
      updateValues.push(usedCount);
    }

    if (req.body?.starts_at !== undefined || req.body?.startsAt !== undefined) {
      const startsAt = normalizeDateTime(req.body?.starts_at ?? req.body?.startsAt);
      updateFields.push('starts_at = ?');
      updateValues.push(startsAt);
    }

    if (req.body?.expires_at !== undefined || req.body?.expiresAt !== undefined) {
      const expiresAt = normalizeDateTime(req.body?.expires_at ?? req.body?.expiresAt);
      updateFields.push('expires_at = ?');
      updateValues.push(expiresAt);
    }

    if (req.body?.notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(safeText(req.body.notes));
    }

    const nextStartsAt = req.body?.starts_at !== undefined || req.body?.startsAt !== undefined
      ? normalizeDateTime(req.body?.starts_at ?? req.body?.startsAt)
      : current.starts_at;

    const nextExpiresAt = req.body?.expires_at !== undefined || req.body?.expiresAt !== undefined
      ? normalizeDateTime(req.body?.expires_at ?? req.body?.expiresAt)
      : current.expires_at;

    if (nextStartsAt && nextExpiresAt && new Date(nextStartsAt).getTime() > new Date(nextExpiresAt).getTime()) {
      return res.status(400).json({
        success: false,
        error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
      });
    }

    if (!updateFields.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(
      `UPDATE ${DISCOUNT_CODES_TABLE}
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    const updated = await getDiscountById(id);

    return res.json({
      success: true,
      message: 'تم تحديث كود الخصم بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث كود الخصم'
    });
  }
});

/**
 * POST /api/discounts/:id/toggle
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getDiscountById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'كود الخصم غير موجود'
      });
    }

    const nextStatus = Number(current.is_active) ? 0 : 1;

    await db.run(
      `UPDATE ${DISCOUNT_CODES_TABLE}
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextStatus, id]
    );

    const updated = await getDiscountById(id);

    return res.json({
      success: true,
      message: nextStatus ? 'تم تفعيل كود الخصم' : 'تم إيقاف كود الخصم',
      data: updated
    });
  } catch (error) {
    console.error('❌ خطأ في تبديل حالة كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تبديل حالة كود الخصم'
    });
  }
});

/**
 * DELETE /api/discounts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getDiscountById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'كود الخصم غير موجود'
      });
    }

    await db.run(
      `DELETE FROM ${DISCOUNT_CODES_TABLE} WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'تم حذف كود الخصم بنجاح',
      data: {
        deletedId: current.id,
        deletedCode: current.code
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف كود الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف كود الخصم'
    });
  }
});

/**
 * GET /api/discounts
 * query:
 * - search
 * - is_active
 * - limit
 * - offset
 * - sort
 * - order
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      is_active,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const parsedLimit = Math.max(1, Math.min(200, toInt(limit, 50)));
    const parsedOffset = Math.max(0, toInt(offset, 0));
    const validSortColumns = ['created_at', 'updated_at', 'code', 'value', 'used_count', 'is_active'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `SELECT * FROM ${DISCOUNT_CODES_TABLE}`;
    const where = [];
    const params = [];

    if (is_active !== undefined && is_active !== '') {
      where.push('is_active = ?');
      params.push(normalizeBooleanFlag(is_active, true));
    }

    if (search) {
      const q = `%${safeText(search)}%`;
      where.push(`(code LIKE ? OR notes LIKE ?)`);
      params.push(q, q);
    }

    if (where.length) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    sql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    const rows = await db.all(sql, params);
    const data = Array.isArray(rows) ? rows.map(mapDiscountRow) : [];

    let countSql = `SELECT COUNT(*) as total FROM ${DISCOUNT_CODES_TABLE}`;
    const countParams = [];

    if (where.length) {
      countSql += ` WHERE ${where.join(' AND ')}`;

      if (is_active !== undefined && is_active !== '') {
        countParams.push(normalizeBooleanFlag(is_active, true));
      }

      if (search) {
        const q = `%${safeText(search)}%`;
        countParams.push(q, q);
      }
    }

    const totalRow = await db.get(countSql, countParams);
    const total = toInt(totalRow?.total, 0);

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب أكواد الخصم:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب أكواد الخصم'
    });
  }
});

module.exports = router;