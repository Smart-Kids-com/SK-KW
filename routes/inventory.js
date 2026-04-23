const express = require('express');
const router = express.Router();
const {
  ensureInventoryColumns,
  getProductInventoryById,
  syncProductInventoryById,
  listInventory
} = require('../services/inventory-service');

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

function normalizeStatus(value) {
  const raw = safeText(value).toLowerCase();
  return raw === 'archived' ? 'archived' : 'active';
}

function calculateAvailable({ onHand, committed, unavailable }) {
  return Math.max(0, toInt(onHand, 0) - toInt(committed, 0) - toInt(unavailable, 0));
}

function getInventoryState(row) {
  const onHand = Math.max(0, toInt(row?.on_hand, 0));
  const committed = Math.max(0, toInt(row?.committed, 0));
  const unavailable = Math.max(0, toInt(row?.unavailable, 0));
  const available = calculateAvailable({ onHand, committed, unavailable });

  const baseStatus = normalizeStatus(row?.status || 'active');
  const inventoryEnabled = Number(row?.inventory_enabled ?? 1) === 1;
  const inventoryBlocked = Number(row?.inventory_blocked ?? 0) === 1;

  const purchasable =
    inventoryEnabled &&
    !inventoryBlocked &&
    baseStatus === 'active' &&
    available > 0;

  const stockLabel = purchasable ? 'متوفر' : 'نفدت الكمية';

  return {
    on_hand: onHand,
    committed,
    unavailable,
    available,
    inventory_enabled: inventoryEnabled ? 1 : 0,
    inventory_blocked: inventoryBlocked ? 1 : 0,
    status: purchasable ? 'active' : baseStatus,
    storefront_status: purchasable ? 'in_stock' : 'out_of_stock',
    purchasable: purchasable ? 1 : 0,
    stock: available,
    stock_label: stockLabel
  };
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const exists = Array.isArray(columns) && columns.some(col => col.name === columnName);

  if (!exists) {
    await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  }
}

async function ensureInventoryColumns() {
  await addColumnIfMissing(PRODUCTS_TABLE, 'sku', `TEXT DEFAULT ''`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'stock', `INTEGER DEFAULT 0`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'on_hand', `INTEGER DEFAULT 0`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'committed', `INTEGER DEFAULT 0`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'unavailable', `INTEGER DEFAULT 0`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'inventory_enabled', `INTEGER DEFAULT 1`);
  await addColumnIfMissing(PRODUCTS_TABLE, 'inventory_blocked', `INTEGER DEFAULT 0`);
}

async function getProductById(id) {
  return db.get(
    `
    SELECT
      id,
      product_name,
      sku,
      status,
      COALESCE(stock, 0) as stock,
      COALESCE(on_hand, 0) as on_hand,
      COALESCE(committed, 0) as committed,
      COALESCE(unavailable, 0) as unavailable,
      COALESCE(inventory_enabled, 1) as inventory_enabled,
      COALESCE(inventory_blocked, 0) as inventory_blocked,
      created_at,
      updated_at
    FROM ${PRODUCTS_TABLE}
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );
}

function mapInventoryRow(row) {
  if (!row) return null;

  const inventory = getInventoryState(row);

  return {
    id: row.id,
    product_name: safeText(row.product_name, `Product ${row.id}`),
    sku: safeText(row.sku),
    status: normalizeStatus(row.status || 'active'),
    ...inventory,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

async function syncProductInventoryById(id, overrides = {}) {
  const current = await getProductById(id);
  if (!current) return null;

  const next = {
    on_hand: overrides.on_hand !== undefined ? Math.max(0, toInt(overrides.on_hand, 0)) : Math.max(0, toInt(current.on_hand, 0)),
    committed: overrides.committed !== undefined ? Math.max(0, toInt(overrides.committed, 0)) : Math.max(0, toInt(current.committed, 0)),
    unavailable: overrides.unavailable !== undefined ? Math.max(0, toInt(overrides.unavailable, 0)) : Math.max(0, toInt(current.unavailable, 0)),
    inventory_enabled: overrides.inventory_enabled !== undefined ? (Number(overrides.inventory_enabled) ? 1 : 0) : Number(current.inventory_enabled ?? 1) ? 1 : 0,
    inventory_blocked: overrides.inventory_blocked !== undefined ? (Number(overrides.inventory_blocked) ? 1 : 0) : Number(current.inventory_blocked ?? 0) ? 1 : 0,
    sku: overrides.sku !== undefined ? safeText(overrides.sku) : safeText(current.sku),
    status: overrides.status !== undefined ? normalizeStatus(overrides.status) : normalizeStatus(current.status || 'active')
  };

  const derived = getInventoryState({
    ...current,
    ...next
  });

  await db.run(
    `
    UPDATE ${PRODUCTS_TABLE}
    SET
      sku = ?,
      stock = ?,
      on_hand = ?,
      committed = ?,
      unavailable = ?,
      inventory_enabled = ?,
      inventory_blocked = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      next.sku,
      derived.stock,
      next.on_hand,
      next.committed,
      next.unavailable,
      next.inventory_enabled,
      next.inventory_blocked,
      next.status,
      id
    ]
  );

  const updated = await getProductById(id);
  return mapInventoryRow(updated);
}

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

/**
 * GET /api/inventory
 * query:
 * - search
 * - stock_status = in_stock | out_of_stock
 * - sort = product_name | sku | unavailable | committed | available | on_hand
 * - order = ASC | DESC
 * - limit
 * - offset
 */
router.get('/', async (req, res) => {
  try {
    const search = safeText(req.query.search);
    const stockStatus = safeText(req.query.stock_status).toLowerCase();
    const sort = safeText(req.query.sort, 'product_name');
    const order = String(req.query.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const limit = Math.max(1, Math.min(200, toInt(req.query.limit, 50)));
    const offset = Math.max(0, toInt(req.query.offset, 0));

    const rows = await db.all(
      `
      SELECT
        id,
        product_name,
        sku,
        status,
        COALESCE(stock, 0) as stock,
        COALESCE(on_hand, 0) as on_hand,
        COALESCE(committed, 0) as committed,
        COALESCE(unavailable, 0) as unavailable,
        COALESCE(inventory_enabled, 1) as inventory_enabled,
        COALESCE(inventory_blocked, 0) as inventory_blocked,
        created_at,
        updated_at
      FROM ${PRODUCTS_TABLE}
      ORDER BY id DESC
      `
    );

    let items = rows.map(mapInventoryRow);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => {
        const haystack = [
          item.product_name,
          item.sku,
          item.id
        ].join(' ').toLowerCase();

        return haystack.includes(q);
      });
    }

    if (stockStatus === 'in_stock') {
      items = items.filter(item => item.storefront_status === 'in_stock');
    } else if (stockStatus === 'out_of_stock') {
      items = items.filter(item => item.storefront_status === 'out_of_stock');
    }

    const sorters = {
      product_name: (a, b) => a.product_name.localeCompare(b.product_name, 'ar'),
      sku: (a, b) => a.sku.localeCompare(b.sku, 'en'),
      unavailable: (a, b) => a.unavailable - b.unavailable,
      committed: (a, b) => a.committed - b.committed,
      available: (a, b) => a.available - b.available,
      on_hand: (a, b) => a.on_hand - b.on_hand
    };

    const sorter = sorters[sort] || sorters.product_name;
    items.sort(sorter);
    if (order === 'DESC') items.reverse();

    const total = items.length;
    const data = items.slice(offset, offset + limit);

    return res.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('inventory list error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المخزون'
    });
  }
});

/**
 * GET /api/inventory/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const row = await getProductById(req.params.id);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    return res.json({
      success: true,
      data: mapInventoryRow(row)
    });
  } catch (error) {
    console.error('inventory get error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المنتج'
    });
  }
});

/**
 * PUT /api/inventory/:id
 * body:
 * {
 *   sku,
 *   on_hand,
 *   committed,
 *   unavailable,
 *   inventory_enabled,
 *   inventory_blocked,
 *   status
 * }
 */
router.put('/:id', async (req, res) => {
  try {
    const current = await getProductById(req.params.id);

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

/**
 * POST /api/inventory/:id/open
 * يفتح المنتج للشراء طالما فيه كمية متاحة
 */
router.post('/:id/open', async (req, res) => {
  try {
    const current = await getProductById(req.params.id);

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

/**
 * POST /api/inventory/:id/close
 * يغلق المنتج على الواجهة مباشرة
 */
router.post('/:id/close', async (req, res) => {
  try {
    const current = await getProductById(req.params.id);

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

/**
 * POST /api/inventory/:id/set-available
 * body: { available }
 */
router.post('/:id/set-available', async (req, res) => {
  try {
    const current = await getProductById(req.params.id);

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

/**
 * POST /api/inventory/bulk
 * body:
 * {
 *   updates: [
 *     { id, sku, on_hand, committed, unavailable, inventory_enabled, inventory_blocked, status }
 *   ]
 * }
 */
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