const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

const TABLE_NAME = 'abandoned_checkouts';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LEN = 120;
const ALLOWED_STATUSES = ['open', 'recovered', 'closed'];

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(status, fallback = 'open') {
  const value = safeText(status).toLowerCase();
  return ALLOWED_STATUSES.includes(value) ? value : fallback;
}

function normalizeContactType(value) {
  const normalized = safeText(value).toLowerCase();
  if (normalized === 'email' || normalized === 'phone') return normalized;
  return '';
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const quantity = Math.max(1, toInt(item.quantity, 1));
      const price = Math.max(0, toNumber(item.price, 0));
      const id = safeText(item.id || item.productId || item.product_id || `item_${index + 1}`);
      const slug = safeText(item.slug);
      const name = safeText(item.name || item.product_name || item.title || `Item ${index + 1}`);
      const image = safeText(item.image || item.image_url || item.product_image || '');

      return {
        id,
        slug,
        name,
        image,
        price,
        quantity
      };
    })
    .filter(item => item.name);
}

function stringifyItems(items) {
  return JSON.stringify(normalizeItems(items));
}

function parseItems(itemsJson) {
  try {
    const parsed = JSON.parse(itemsJson || '[]');
    return normalizeItems(parsed);
  } catch (_) {
    return [];
  }
}

function buildCustomerName(firstName, lastName, fallback = '') {
  const full = `${safeText(firstName)} ${safeText(lastName)}`.trim();
  return full || safeText(fallback);
}

async function ensureTableExists() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open',

      contact_value TEXT DEFAULT '',
      contact_type TEXT DEFAULT '',

      customer_email TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',

      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',

      address1 TEXT DEFAULT '',
      address2 TEXT DEFAULT '',
      city TEXT DEFAULT '',
      governorate TEXT DEFAULT '',
      country TEXT DEFAULT 'Kuwait',
      postal_code TEXT DEFAULT '',

      notes TEXT DEFAULT '',
      discount_code TEXT DEFAULT '',
      discount_amount REAL NOT NULL DEFAULT 0,

      subtotal REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'KWD',

      cart_items TEXT DEFAULT '[]',
      cart_quantity INTEGER NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,

      recovered_order_id TEXT DEFAULT '',
      recovered_order_number TEXT DEFAULT '',

      last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_token ON ${TABLE_NAME}(checkout_token)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status ON ${TABLE_NAME}(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_last_activity ON ${TABLE_NAME}(last_activity_at)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_email ON ${TABLE_NAME}(customer_email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_phone ON ${TABLE_NAME}(customer_phone)`);
}

function mapRow(row) {
  if (!row) return null;

  return {
    ...row,
    subtotal: toNumber(row.subtotal, 0),
    shipping_cost: toNumber(row.shipping_cost, 0),
    total: toNumber(row.total, 0),
    discount_amount: toNumber(row.discount_amount, 0),
    cart_quantity: toInt(row.cart_quantity, 0),
    item_count: toInt(row.item_count, 0),
    cart_items: parseItems(row.cart_items)
  };
}

async function getByToken(checkoutToken) {
  const row = await db.get(
    `SELECT * FROM ${TABLE_NAME} WHERE checkout_token = ?`,
    [checkoutToken]
  );
  return mapRow(row);
}

async function getById(id) {
  const row = await db.get(
    `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
    [id]
  );
  return mapRow(row);
}

/**
 * POST /api/abandoned-checkouts/save
 * Upsert checkout draft
 */
router.post('/save', async (req, res) => {
  try {
    await ensureTableExists();

    const {
      checkoutToken,
      contactValue,
      contactType,
      customerEmail,
      customerPhone,
      firstName,
      lastName,
      customerName,
      address1,
      address2,
      city,
      governorate,
      country,
      postalCode,
      notes,
      discountCode,
      discountAmount,
      subtotal,
      shippingCost,
      total,
      currency,
      cartItems,
      cartQuantity,
      itemCount
    } = req.body || {};

    const token = safeText(checkoutToken);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'checkoutToken is required'
      });
    }

    const normalizedItems = normalizeItems(cartItems);
    const finalItemCount = itemCount !== undefined ? Math.max(0, toInt(itemCount, 0)) : normalizedItems.length;
    const finalCartQuantity = cartQuantity !== undefined
      ? Math.max(0, toInt(cartQuantity, 0))
      : normalizedItems.reduce((sum, item) => sum + toInt(item.quantity, 0), 0);

    const finalFirstName = safeText(firstName);
    const finalLastName = safeText(lastName);
    const finalCustomerName = buildCustomerName(finalFirstName, finalLastName, customerName);

    const existing = await db.get(
      `SELECT id FROM ${TABLE_NAME} WHERE checkout_token = ?`,
      [token]
    );

    const values = [
      safeText(contactValue),
      normalizeContactType(contactType),
      safeText(customerEmail),
      safeText(customerPhone),
      finalFirstName,
      finalLastName,
      finalCustomerName,
      safeText(address1),
      safeText(address2),
      safeText(city),
      safeText(governorate),
      safeText(country, 'Kuwait'),
      safeText(postalCode),
      safeText(notes),
      safeText(discountCode),
      Math.max(0, toNumber(discountAmount, 0)),
      Math.max(0, toNumber(subtotal, 0)),
      Math.max(0, toNumber(shippingCost, 0)),
      Math.max(0, toNumber(total, 0)),
      safeText(currency, 'KWD'),
      stringifyItems(normalizedItems),
      finalCartQuantity,
      finalItemCount
    ];

    if (existing?.id) {
      await db.run(
        `UPDATE ${TABLE_NAME}
         SET
           status = 'open',
           contact_value = ?,
           contact_type = ?,
           customer_email = ?,
           customer_phone = ?,
           first_name = ?,
           last_name = ?,
           customer_name = ?,
           address1 = ?,
           address2 = ?,
           city = ?,
           governorate = ?,
           country = ?,
           postal_code = ?,
           notes = ?,
           discount_code = ?,
           discount_amount = ?,
           subtotal = ?,
           shipping_cost = ?,
           total = ?,
           currency = ?,
           cart_items = ?,
           cart_quantity = ?,
           item_count = ?,
           updated_at = CURRENT_TIMESTAMP,
           last_activity_at = CURRENT_TIMESTAMP
         WHERE checkout_token = ?`,
        [...values, token]
      );
    } else {
      await db.run(
        `INSERT INTO ${TABLE_NAME}
         (
           checkout_token,
           status,
           contact_value,
           contact_type,
           customer_email,
           customer_phone,
           first_name,
           last_name,
           customer_name,
           address1,
           address2,
           city,
           governorate,
           country,
           postal_code,
           notes,
           discount_code,
           discount_amount,
           subtotal,
           shipping_cost,
           total,
           currency,
           cart_items,
           cart_quantity,
           item_count,
           created_at,
           updated_at,
           last_activity_at
         )
         VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [token, ...values]
      );
    }

    const saved = await getByToken(token);

    return res.json({
      success: true,
      message: 'Abandoned checkout saved',
      data: saved
    });
  } catch (error) {
    console.error('❌ save abandoned checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save abandoned checkout'
    });
  }
});

/**
 * POST /api/abandoned-checkouts/recover
 * Mark abandoned checkout as recovered after order success
 */
router.post('/recover', async (req, res) => {
  try {
    await ensureTableExists();

    const {
      checkoutToken,
      orderId,
      orderNumber
    } = req.body || {};

    const token = safeText(checkoutToken);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'checkoutToken is required'
      });
    }

    const existing = await getByToken(token);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Checkout not found'
      });
    }

    await db.run(
      `UPDATE ${TABLE_NAME}
       SET
         status = 'recovered',
         recovered_order_id = ?,
         recovered_order_number = ?,
         updated_at = CURRENT_TIMESTAMP,
         last_activity_at = CURRENT_TIMESTAMP
       WHERE checkout_token = ?`,
      [
        safeText(orderId),
        safeText(orderNumber),
        token
      ]
    );

    const updated = await getByToken(token);

    return res.json({
      success: true,
      message: 'Abandoned checkout recovered',
      data: updated
    });
  } catch (error) {
    console.error('❌ recover abandoned checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to recover abandoned checkout'
    });
  }
});

/**
 * POST /api/abandoned-checkouts/close
 */
router.post('/close', async (req, res) => {
  try {
    await ensureTableExists();

    const { checkoutToken } = req.body || {};
    const token = safeText(checkoutToken);

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'checkoutToken is required'
      });
    }

    const existing = await getByToken(token);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Checkout not found'
      });
    }

    await db.run(
      `UPDATE ${TABLE_NAME}
       SET status = 'closed', updated_at = CURRENT_TIMESTAMP
       WHERE checkout_token = ?`,
      [token]
    );

    const updated = await getByToken(token);

    return res.json({
      success: true,
      message: 'Abandoned checkout closed',
      data: updated
    });
  } catch (error) {
    console.error('❌ close abandoned checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to close abandoned checkout'
    });
  }
});

/**
 * GET /api/abandoned-checkouts/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    await ensureTableExists();

    const total = await db.get(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
    const open = await db.get(`SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = 'open'`);
    const recovered = await db.get(`SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = 'recovered'`);
    const closed = await db.get(`SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = 'closed'`);

    return res.json({
      success: true,
      data: {
        total: toInt(total?.count, 0),
        open: toInt(open?.count, 0),
        recovered: toInt(recovered?.count, 0),
        closed: toInt(closed?.count, 0)
      }
    });
  } catch (error) {
    console.error('❌ abandoned checkout stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load abandoned checkout stats'
    });
  }
});

/**
 * GET /api/abandoned-checkouts/token/:token
 */
router.get('/token/:token', async (req, res) => {
  try {
    await ensureTableExists();

    const checkout = await getByToken(req.params.token);

    if (!checkout) {
      return res.status(404).json({
        success: false,
        error: 'Checkout not found'
      });
    }

    return res.json({
      success: true,
      data: checkout
    });
  } catch (error) {
    console.error('❌ get abandoned checkout by token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load checkout'
    });
  }
});

/**
 * GET /api/abandoned-checkouts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    await ensureTableExists();

    const checkout = await getById(req.params.id);

    if (!checkout) {
      return res.status(404).json({
        success: false,
        error: 'Checkout not found'
      });
    }

    return res.json({
      success: true,
      data: checkout
    });
  } catch (error) {
    console.error('❌ get abandoned checkout by id error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load checkout'
    });
  }
});

/**
 * GET /api/abandoned-checkouts
 * Query:
 * - status
 * - search
 * - limit
 * - offset
 * - sort
 * - order
 */
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();

    const {
      status = '',
      search = '',
      limit = DEFAULT_LIMIT,
      offset = 0,
      sort = 'last_activity_at',
      order = 'DESC'
    } = req.query;

    const parsedLimit = Math.max(1, Math.min(MAX_LIMIT, toInt(limit, DEFAULT_LIMIT)));
    const parsedOffset = Math.max(0, toInt(offset, 0));
    const validSortColumns = ['created_at', 'updated_at', 'last_activity_at', 'total', 'customer_name', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'last_activity_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `SELECT * FROM ${TABLE_NAME}`;
    const conditions = [];
    const params = [];

    const normalizedStatus = normalizeStatus(status, '');
    if (normalizedStatus) {
      conditions.push(`status = ?`);
      params.push(normalizedStatus);
    }

    const searchText = safeText(search).slice(0, MAX_SEARCH_LEN);
    if (searchText) {
      const q = `%${searchText}%`;
      conditions.push(`(
        checkout_token LIKE ?
        OR customer_name LIKE ?
        OR customer_email LIKE ?
        OR customer_phone LIKE ?
        OR contact_value LIKE ?
        OR city LIKE ?
        OR governorate LIKE ?
      )`);
      params.push(q, q, q, q, q, q, q);
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.get(countSql, params);
    const total = toInt(countResult?.total, 0);

    sql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    const rows = await db.all(sql, [...params, parsedLimit, parsedOffset]);

    return res.json({
      success: true,
      data: Array.isArray(rows) ? rows.map(mapRow) : [],
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / Math.max(1, parsedLimit))
      }
    });
  } catch (error) {
    console.error('❌ list abandoned checkouts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load abandoned checkouts'
    });
  }
});

/**
 * DELETE /api/abandoned-checkouts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await ensureTableExists();

    const checkout = await getById(req.params.id);

    if (!checkout) {
      return res.status(404).json({
        success: false,
        error: 'Checkout not found'
      });
    }

    await db.run(
      `DELETE FROM ${TABLE_NAME} WHERE id = ?`,
      [req.params.id]
    );

    return res.json({
      success: true,
      message: 'Abandoned checkout deleted',
      data: {
        deletedId: checkout.id,
        checkoutToken: checkout.checkout_token
      }
    });
  } catch (error) {
    console.error('❌ delete abandoned checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete abandoned checkout'
    });
  }
});

module.exports = router;
