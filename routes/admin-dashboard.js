const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

const ACTIVE_VISITOR_WINDOW_MS = 2 * 60 * 1000;
const MAX_SEARCH_LENGTH = 80;
const MAX_TEXT_LENGTH = 500;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeLimitedText(value, fallback = '', maxLength = MAX_TEXT_LENGTH) {
  const text = safeText(value, fallback);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDateRange(query) {
  const now = new Date();

  let from = toDate(query.from) || startOfDay(now);
  let to = toDate(query.to) || endOfDay(now);

  if (from.getTime() > to.getTime()) {
    const temp = from;
    from = to;
    to = temp;
  }

  return { from, to };
}

function escapeLike(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

function makeLikeQuery(value) {
  return `%${escapeLike(value)}%`;
}

const tableColumnsCache = new Map();

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const rows = await db.all(`PRAGMA table_info(${quoteIdentifier(tableName)})`);

  const columns = new Set(
    (Array.isArray(rows) ? rows : [])
      .map(row => row?.name)
      .filter(Boolean)
  );

  tableColumnsCache.set(tableName, columns);
  return columns;
}

function firstExistingColumn(columns, candidates) {
  return candidates.find(column => columns.has(column)) || null;
}

function existingColumns(columns, candidates) {
  return candidates.filter(column => columns.has(column));
}

async function ensureHeartbeatTable() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS visitor_heartbeats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL UNIQUE,
      page TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      source TEXT DEFAULT 'storefront',
      first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_visitor_heartbeats_last_seen
    ON visitor_heartbeats(last_seen_at)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_visitor_heartbeats_source
    ON visitor_heartbeats(source)
  `);
}

async function tryGetOrdersInRange(fromIso, toIso) {
  try {
    const rows = await db.all(
      `SELECT *
       FROM orders
       WHERE datetime(created_at) >= datetime(?)
         AND datetime(created_at) <= datetime(?)
       ORDER BY datetime(created_at) DESC`,
      [fromIso, toIso]
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('tryGetOrdersInRange error:', error);
    return [];
  }
}

async function tryGetAbandonedSummaryInRange(fromIso, toIso) {
  try {
    const total = await db.get(
      `SELECT COUNT(*) as count
       FROM abandoned_checkouts
       WHERE datetime(created_at) >= datetime(?)
         AND datetime(created_at) <= datetime(?)`,
      [fromIso, toIso]
    );

    const open = await db.get(
      `SELECT COUNT(*) as count
       FROM abandoned_checkouts
       WHERE status = 'open'
         AND datetime(created_at) >= datetime(?)
         AND datetime(created_at) <= datetime(?)`,
      [fromIso, toIso]
    );

    const recovered = await db.get(
      `SELECT COUNT(*) as count
       FROM abandoned_checkouts
       WHERE status = 'recovered'
         AND datetime(created_at) >= datetime(?)
         AND datetime(created_at) <= datetime(?)`,
      [fromIso, toIso]
    );

    const closed = await db.get(
      `SELECT COUNT(*) as count
       FROM abandoned_checkouts
       WHERE status = 'closed'
         AND datetime(created_at) >= datetime(?)
         AND datetime(created_at) <= datetime(?)`,
      [fromIso, toIso]
    );

    return {
      total: safeNumber(total?.count, 0),
      open: safeNumber(open?.count, 0),
      recovered: safeNumber(recovered?.count, 0),
      closed: safeNumber(closed?.count, 0)
    };
  } catch (error) {
    console.error('tryGetAbandonedSummaryInRange error:', error);
    return {
      total: 0,
      open: 0,
      recovered: 0,
      closed: 0
    };
  }
}

async function countSessionsInRange(fromIso, toIso) {
  try {
    await ensureHeartbeatTable();

    const row = await db.get(
      `SELECT COUNT(DISTINCT visitor_id) as count
       FROM visitor_heartbeats
       WHERE source = 'storefront'
         AND datetime(last_seen_at) >= datetime(?)
         AND datetime(last_seen_at) <= datetime(?)`,
      [fromIso, toIso]
    );

    return safeNumber(row?.count, 0);
  } catch (error) {
    console.error('countSessionsInRange error:', error);
    return 0;
  }
}

async function countLiveVisitors() {
  try {
    await ensureHeartbeatTable();

    const activeSince = new Date(Date.now() - ACTIVE_VISITOR_WINDOW_MS).toISOString();

    const row = await db.get(
      `SELECT COUNT(DISTINCT visitor_id) as count
       FROM visitor_heartbeats
       WHERE source = 'storefront'
         AND datetime(last_seen_at) >= datetime(?)`,
      [activeSince]
    );

    return safeNumber(row?.count, 0);
  } catch (error) {
    console.error('countLiveVisitors error:', error);
    return 0;
  }
}

async function trySearchOrders(q) {
  try {
    const rows = await db.all(
      `SELECT id, order_number, customer_name, customer_email, customer_phone, total, status, created_at
       FROM orders
       WHERE order_number LIKE ? ESCAPE '\\'
          OR customer_name LIKE ? ESCAPE '\\'
          OR customer_email LIKE ? ESCAPE '\\'
          OR customer_phone LIKE ? ESCAPE '\\'
       ORDER BY datetime(created_at) DESC
       LIMIT 8`,
      [q, q, q, q]
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('trySearchOrders error:', error);
    return [];
  }
}

async function trySearchAbandoned(q) {
  try {
    const rows = await db.all(
      `SELECT id, checkout_token, customer_name, customer_email, customer_phone, contact_value, total, status, created_at
       FROM abandoned_checkouts
       WHERE checkout_token LIKE ? ESCAPE '\\'
          OR customer_name LIKE ? ESCAPE '\\'
          OR customer_email LIKE ? ESCAPE '\\'
          OR customer_phone LIKE ? ESCAPE '\\'
          OR contact_value LIKE ? ESCAPE '\\'
       ORDER BY datetime(created_at) DESC
       LIMIT 8`,
      [q, q, q, q, q]
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('trySearchAbandoned error:', error);
    return [];
  }
}

async function trySearchProducts(q) {
  try {
    const columns = await getTableColumns('products');

    const nameColumn = firstExistingColumn(columns, [
      'name',
      'product_name',
      'title',
      'product_title'
    ]);

    const searchColumns = existingColumns(
      columns,
      [nameColumn, 'slug', 'sku', 'barcode'].filter(Boolean)
    );

    if (!nameColumn || searchColumns.length === 0) {
      return [];
    }

    const selectColumns = [
      'id',
      `${quoteIdentifier(nameColumn)} AS name`
    ];

    if (columns.has('slug')) selectColumns.push('slug');
    if (columns.has('sku')) selectColumns.push('sku');

    const whereClause = searchColumns
      .map(column => `${quoteIdentifier(column)} LIKE ? ESCAPE '\\'`)
      .join(' OR ');

    const rows = await db.all(
      `SELECT ${selectColumns.join(', ')}
       FROM products
       WHERE ${whereClause}
       ORDER BY id DESC
       LIMIT 8`,
      searchColumns.map(() => q)
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('trySearchProducts error:', error);
    return [];
  }
}

async function trySearchCollections(q) {
  try {
    const columns = await getTableColumns('collections');

    const nameColumn = firstExistingColumn(columns, [
      'name',
      'title',
      'collection_name',
      'handle'
    ]);

    const searchColumns = existingColumns(
      columns,
      [nameColumn, 'slug', 'handle'].filter(Boolean)
    );

    if (!nameColumn || searchColumns.length === 0) {
      return [];
    }

    const selectColumns = [
      'id',
      `${quoteIdentifier(nameColumn)} AS name`
    ];

    if (columns.has('slug')) {
      selectColumns.push('slug');
    } else if (columns.has('handle')) {
      selectColumns.push(`${quoteIdentifier('handle')} AS slug`);
    }

    const whereClause = searchColumns
      .map(column => `${quoteIdentifier(column)} LIKE ? ESCAPE '\\'`)
      .join(' OR ');

    const rows = await db.all(
      `SELECT ${selectColumns.join(', ')}
       FROM collections
       WHERE ${whereClause}
       ORDER BY id DESC
       LIMIT 8`,
      searchColumns.map(() => q)
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('trySearchCollections error:', error);
    return [];
  }
}

async function trySearchCustomers(q) {
  try {
    const rows = await db.all(
      `SELECT id, full_name AS name, email, phone
       FROM customers
       WHERE full_name LIKE ? ESCAPE '\\'
          OR email LIKE ? ESCAPE '\\'
          OR phone LIKE ? ESCAPE '\\'
       ORDER BY id DESC
       LIMIT 8`,
      [q, q, q]
    );

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error('trySearchCustomers error:', error);
    return [];
  }
}

router.get('/summary', async (req, res) => {
  try {
    await ensureHeartbeatTable();

    const { from, to } = getDateRange(req.query);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const orders = await tryGetOrdersInRange(fromIso, toIso);
    const abandoned = await tryGetAbandonedSummaryInRange(fromIso, toIso);

    const totalSales = orders.reduce((sum, order) => {
      return sum + safeNumber(order.total, 0);
    }, 0);

    const ordersCount = orders.length;

    const pendingOrders = orders.filter(order => {
      const status = safeText(order.status).toLowerCase();
      return ['pending', 'processing'].includes(status);
    }).length;

    const paymentsToCapture = orders.filter(order => {
      const status = safeText(order.status).toLowerCase();
      return ['awaiting_payment', 'pending'].includes(status);
    }).length;

    const sessions = await countSessionsInRange(fromIso, toIso);
    const conversionRate = sessions > 0 ? (ordersCount / sessions) * 100 : 0;
    const liveVisitors = await countLiveVisitors();

    return res.json({
      success: true,
      data: {
        sessions,
        liveVisitors,
        totalSales,
        orders: ordersCount,
        conversionRate,
        pendingOrders,
        paymentsToCapture,
        ordersToFulfill: pendingOrders,
        abandoned
      }
    });
  } catch (error) {
    console.error('admin dashboard summary error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to load admin dashboard summary'
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const rawQ = safeText(req.query.q);

    if (rawQ.length < 2) {
      return res.json({
        success: true,
        data: {
          orders: [],
          abandoned: [],
          products: [],
          collections: [],
          customers: []
        }
      });
    }

    if (rawQ.length > MAX_SEARCH_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'Search query too long'
      });
    }

    const q = makeLikeQuery(rawQ);

    const [orders, abandoned, products, collections, customers] = await Promise.all([
      trySearchOrders(q),
      trySearchAbandoned(q),
      trySearchProducts(q),
      trySearchCollections(q),
      trySearchCustomers(q)
    ]);

    return res.json({
      success: true,
      data: {
        orders,
        abandoned,
        products,
        collections,
        customers
      }
    });
  } catch (error) {
    console.error('admin dashboard search error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to run admin search'
    });
  }
});

router.post('/heartbeat', async (req, res) => {
  try {
    await ensureHeartbeatTable();

    const visitorId = safeLimitedText(req.body?.visitorId, '', 120);

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId is required'
      });
    }

    const page = safeLimitedText(req.body?.page, '', 300);
    const source = safeLimitedText(req.body?.source, 'storefront', 80);
    const userAgent = safeLimitedText(req.headers['user-agent'], '', 500);

    const forwardedFor = safeText(req.headers['x-forwarded-for']);
    const firstForwardedIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';

    const ipAddress = safeLimitedText(
      firstForwardedIp || req.socket?.remoteAddress,
      '',
      120
    );

    const existing = await db.get(
      `SELECT id FROM visitor_heartbeats WHERE visitor_id = ?`,
      [visitorId]
    );

    if (existing?.id) {
      await db.run(
        `UPDATE visitor_heartbeats
         SET page = ?,
             user_agent = ?,
             ip_address = ?,
             source = ?,
             last_seen_at = CURRENT_TIMESTAMP
         WHERE visitor_id = ?`,
        [page, userAgent, ipAddress, source, visitorId]
      );
    } else {
      await db.run(
        `INSERT INTO visitor_heartbeats
         (visitor_id, page, user_agent, ip_address, source, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [visitorId, page, userAgent, ipAddress, source]
      );
    }

    const liveVisitors = await countLiveVisitors();

    return res.json({
      success: true,
      data: {
        liveVisitors
      }
    });
  } catch (error) {
    console.error('admin dashboard heartbeat error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to record visitor heartbeat'
    });
  }
});

router.post('/leave', async (req, res) => {
  try {
    await ensureHeartbeatTable();

    const visitorId = safeLimitedText(req.body?.visitorId, '', 120);

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        error: 'visitorId is required'
      });
    }

    await db.run(
      `UPDATE visitor_heartbeats
       SET last_seen_at = datetime('now', '-10 minutes')
       WHERE visitor_id = ?`,
      [visitorId]
    );

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('admin dashboard leave error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to record visitor leave'
    });
  }
});

module.exports = router;