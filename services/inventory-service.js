const db = require('../db/turso-manager');

const PRODUCTS_TABLE = 'products';

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

  return {
    on_hand: onHand,
    committed,
    unavailable,
    available,
    inventory_enabled: inventoryEnabled ? 1 : 0,
    inventory_blocked: inventoryBlocked ? 1 : 0,
    purchasable: purchasable ? 1 : 0,
    storefront_status: purchasable ? 'in_stock' : 'out_of_stock',
    stock: available,
    stock_label: purchasable ? 'متوفر' : 'نفدت الكمية'
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

async function getProductInventoryById(id) {
  await ensureInventoryColumns();

  const row = await db.get(
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
  await ensureInventoryColumns();

  const current = await db.get(
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
      COALESCE(inventory_blocked, 0) as inventory_blocked
    FROM ${PRODUCTS_TABLE}
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!current) return null;

  const next = {
    sku: overrides.sku !== undefined ? safeText(overrides.sku) : safeText(current.sku),
    status: overrides.status !== undefined ? normalizeStatus(overrides.status) : normalizeStatus(current.status || 'active'),
    on_hand: overrides.on_hand !== undefined ? Math.max(0, toInt(overrides.on_hand, 0)) : Math.max(0, toInt(current.on_hand, 0)),
    committed: overrides.committed !== undefined ? Math.max(0, toInt(overrides.committed, 0)) : Math.max(0, toInt(current.committed, 0)),
    unavailable: overrides.unavailable !== undefined ? Math.max(0, toInt(overrides.unavailable, 0)) : Math.max(0, toInt(current.unavailable, 0)),
    inventory_enabled: overrides.inventory_enabled !== undefined ? (Number(overrides.inventory_enabled) ? 1 : 0) : (Number(current.inventory_enabled ?? 1) ? 1 : 0),
    inventory_blocked: overrides.inventory_blocked !== undefined ? (Number(overrides.inventory_blocked) ? 1 : 0) : (Number(current.inventory_blocked ?? 0) ? 1 : 0)
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
      status = ?,
      stock = ?,
      on_hand = ?,
      committed = ?,
      unavailable = ?,
      inventory_enabled = ?,
      inventory_blocked = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      next.sku,
      next.status,
      derived.stock,
      next.on_hand,
      next.committed,
      next.unavailable,
      next.inventory_enabled,
      next.inventory_blocked,
      id
    ]
  );

  return getProductInventoryById(id);
}

async function validateOrderItemsStock(items) {
  await ensureInventoryColumns();

  const errors = [];

  for (const item of Array.isArray(items) ? items : []) {
    const productId = safeText(item?.product_id || item?.productId);
    const requestedQty = Math.max(1, toInt(item?.quantity, 1));

    if (!productId) {
      errors.push('يوجد منتج بدون معرف صالح');
      continue;
    }

    const product = await db.get(
      `
      SELECT
        id,
        product_name,
        status,
        COALESCE(stock, 0) as stock,
        COALESCE(on_hand, 0) as on_hand,
        COALESCE(committed, 0) as committed,
        COALESCE(unavailable, 0) as unavailable,
        COALESCE(inventory_enabled, 1) as inventory_enabled,
        COALESCE(inventory_blocked, 0) as inventory_blocked
      FROM ${PRODUCTS_TABLE}
      WHERE id = ?
      LIMIT 1
      `,
      [productId]
    );

    if (!product) {
      errors.push(`المنتج ${safeText(item?.product_name || item?.name, productId)} غير موجود`);
      continue;
    }

    const inventory = getInventoryState(product);
    const productName = safeText(product.product_name, safeText(item?.product_name || item?.name, productId));

    if (normalizeStatus(product.status || 'active') !== 'active') {
      errors.push(`المنتج "${productName}" غير متاح حالياً`);
      continue;
    }

    if (!Number(inventory.inventory_enabled)) {
      errors.push(`المنتج "${productName}" غير متاح للشراء حالياً`);
      continue;
    }

    if (Number(inventory.inventory_blocked)) {
      errors.push(`المنتج "${productName}" مغلق حالياً على الواجهة`);
      continue;
    }

    if (inventory.available <= 0) {
      errors.push(`المنتج "${productName}" نفدت كميته`);
      continue;
    }

    if (requestedQty > inventory.available) {
      errors.push(`الكمية المطلوبة من "${productName}" غير متاحة. المتوفر فقط: ${inventory.available}`);
    }
  }

  if (errors.length) {
    return {
      valid: false,
      message: errors[0],
      errors
    };
  }

  return {
    valid: true,
    message: '',
    errors: []
  };
}

async function listInventory({
  search = '',
  stockStatus = '',
  sort = 'product_name',
  order = 'ASC',
  limit = 50,
  offset = 0
} = {}) {
  const safeLimit = Math.max(1, Math.min(200, toInt(limit, 50)));
  const safeOffset = Math.max(0, toInt(offset, 0));
  const q = safeText(search).toLowerCase();
  const stockStatusNormalized = safeText(stockStatus).toLowerCase();
  const sortOrder = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sortMap = {
  product_name: 'id',
  sku: 'id',
  unavailable: 'unavailable',
  committed: 'committed',
  available: 'stock',
  on_hand: 'on_hand'
};

const sortColumn = sortMap[sort] || 'id';

  const where = [];
  const params = [];

  if (q) {
    where.push(`(
      LOWER(COALESCE(product_name, '')) LIKE ?
      OR LOWER(COALESCE(sku, '')) LIKE ?
      OR CAST(id AS TEXT) LIKE ?
    )`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (stockStatusNormalized === 'in_stock') {
    where.push(`
      COALESCE(inventory_enabled, 1) = 1
      AND COALESCE(inventory_blocked, 0) = 0
      AND LOWER(COALESCE(status, 'active')) = 'active'
      AND COALESCE(stock, 0) > 0
    `);
  } else if (stockStatusNormalized === 'out_of_stock') {
    where.push(`(
      COALESCE(inventory_enabled, 1) = 0
      OR COALESCE(inventory_blocked, 0) = 1
      OR LOWER(COALESCE(status, 'active')) <> 'active'
      OR COALESCE(stock, 0) <= 0
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await db.get(
    `
    SELECT COUNT(*) as count
    FROM ${PRODUCTS_TABLE}
    ${whereSql}
    `,
    params
  );

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
    ${whereSql}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, safeOffset]
  );

  const items = rows.map(row => {
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
  });

  const total = Number(countRow?.count || 0);

  return {
    data: items,
    pagination: {
      total,
      limit: safeLimit,
      offset: safeOffset,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
}

module.exports = {
  PRODUCTS_TABLE,
  toNumber,
  toInt,
  safeText,
  normalizeStatus,
  calculateAvailable,
  getInventoryState,
  ensureInventoryColumns,
  getProductInventoryById,
  syncProductInventoryById,
  validateOrderItemsStock,
  listInventory
};