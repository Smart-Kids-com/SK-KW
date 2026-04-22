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

async function getDiscountByCode(code) {
  const row = await db.get(
    `SELECT * FROM ${DISCOUNT_CODES_TABLE} WHERE UPPER(TRIM(code)) = ?`,
    [normalizeCode(code)]
  );

  return mapDiscountRow(row);
}

/**
 * POST /api/store/discounts/validate
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
    console.error('❌ store discount validate error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في التحقق من كود الخصم'
    });
  }
});

module.exports = router;