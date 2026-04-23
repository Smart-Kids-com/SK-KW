const express = require('express');
const router = express.Router();

const {
  safeText,
  toInt,
  ensureInventoryColumns,
  getProductInventoryById,
  syncProductInventoryById,
  listInventory
} = require('../services/inventory-service');

router.use(async (req, res, next) => {
  try {
    await ensureInventoryColumns();
    next();
  } catch (error) {
    console.error('inventory schema ensure error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تهيئة أعمدة المخزون'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await listInventory({
      search: req.query.search,
      stockStatus: req.query.stock_status,
      sort: req.query.sort,
      order: req.query.order,
      limit: req.query.limit,
      offset: req.query.offset
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('inventory list error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المخزون'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getProductInventoryById(req.params.id);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    return res.json({
      success: true,
      data: row
    });
  } catch (error) {
    console.error('inventory get error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المنتج'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const current = await getProductInventoryById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const payload = {};

    if (req.body.sku !== undefined) payload.sku = req.body.sku;
    if (req.body.on_hand !== undefined) payload.on_hand = req.body.on_hand;
    if (req.body.committed !== undefined) payload.committed = req.body.committed;
    if (req.body.unavailable !== undefined) payload.unavailable = req.body.unavailable;
    if (req.body.inventory_enabled !== undefined) payload.inventory_enabled = req.body.inventory_enabled;
    if (req.body.inventory_blocked !== undefined) payload.inventory_blocked = req.body.inventory_blocked;
    if (req.body.status !== undefined) payload.status = req.body.status;

    const updated = await syncProductInventoryById(req.params.id, payload);

    return res.json({
      success: true,
      message: 'تم تحديث المخزون بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('inventory update error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث المخزون'
    });
  }
});

router.post('/:id/open', async (req, res) => {
  try {
    const current = await getProductInventoryById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const updated = await syncProductInventoryById(req.params.id, {
      inventory_enabled: 1,
      inventory_blocked: 0,
      status: 'active'
    });

    return res.json({
      success: true,
      message: 'تم فتح المنتج',
      data: updated
    });
  } catch (error) {
    console.error('inventory open error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في فتح المنتج'
    });
  }
});

router.post('/:id/close', async (req, res) => {
  try {
    const current = await getProductInventoryById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const updated = await syncProductInventoryById(req.params.id, {
      inventory_blocked: 1
    });

    return res.json({
      success: true,
      message: 'تم إغلاق المنتج على الواجهة',
      data: updated
    });
  } catch (error) {
    console.error('inventory close error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إغلاق المنتج'
    });
  }
});

router.post('/:id/set-available', async (req, res) => {
  try {
    const current = await getProductInventoryById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const targetAvailable = Math.max(0, toInt(req.body.available, 0));
    const committed = Math.max(0, toInt(current.committed, 0));
    const unavailable = Math.max(0, toInt(current.unavailable, 0));
    const onHand = targetAvailable + committed + unavailable;

    const updated = await syncProductInventoryById(req.params.id, {
      on_hand: onHand
    });

    return res.json({
      success: true,
      message: 'تم ضبط الكمية المتاحة بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('inventory set available error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في ضبط الكمية المتاحة'
    });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    const results = [];

    for (const item of updates) {
      const id = safeText(item?.id);
      if (!id) continue;

      const updated = await syncProductInventoryById(id, {
        sku: item?.sku,
        on_hand: item?.on_hand,
        committed: item?.committed,
        unavailable: item?.unavailable,
        inventory_enabled: item?.inventory_enabled,
        inventory_blocked: item?.inventory_blocked,
        status: item?.status
      });

      if (updated) results.push(updated);
    }

    return res.json({
      success: true,
      message: 'تم تحديث المخزون المحدد',
      data: results
    });
  } catch (error) {
    console.error('inventory bulk update error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في التحديث الجماعي للمخزون'
    });
  }
});

module.exports = router;