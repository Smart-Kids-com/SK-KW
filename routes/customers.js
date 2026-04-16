const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

/**
 * Guardrails
 */
const CUSTOMER_STATUSES = ['active', 'new', 'inactive', 'blocked'];
const DB_OP_TIMEOUT_MS = 25_000;
const MAX_SEARCH_LEN = 80;

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Helpers
 */
function normalizeText(value = '') {
  return String(value || '').trim();
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(status = '') {
  const value = String(status || '').trim().toLowerCase();
  return CUSTOMER_STATUSES.includes(value) ? value : '';
}

function parseCustomerStatusFilter(status) {
  const raw = String(status || '').trim().toLowerCase();
  return CUSTOMER_STATUSES.includes(raw) ? raw : null;
}

function normalizeBooleanFlag(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') return defaultValue ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;

  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return 1;
  if (['0', 'false', 'no', 'off'].includes(text)) return 0;

  return defaultValue ? 1 : 0;
}

function deriveCustomerStatus(customer) {
  const explicit = normalizeStatus(customer.status);
  if (explicit) return explicit;

  const totalOrders = Number(customer.total_orders || 0);
  const createdAt = customer.created_at ? new Date(customer.created_at).getTime() : Date.now();
  const ageDays = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));

  if (customer.is_blocked || customer.blocked) return 'blocked';
  if (totalOrders > 0) return 'active';
  if (ageDays <= 14) return 'new';
  return 'inactive';
}

async function getCustomerById(id) {
  return await withTimeout(
    db.get(`SELECT * FROM customers WHERE id = ?`, [id]),
    DB_OP_TIMEOUT_MS,
    'getCustomerById'
  );
}

async function ensureCustomersTable() {
  await withTimeout(
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        city TEXT,
        area TEXT,
        status TEXT DEFAULT 'new',
        total_orders INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        accepts_marketing INTEGER DEFAULT 0,
        marketing_opt_in INTEGER DEFAULT 0,
        last_order_at TEXT,
        is_blocked INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    DB_OP_TIMEOUT_MS,
    'ensureCustomersTable'
  );
}

/**
 * GET /api/customers/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    await ensureCustomersTable();

    const rows = await withTimeout(
      db.all(`SELECT * FROM customers`),
      DB_OP_TIMEOUT_MS,
      'listCustomersForStats'
    );
    const customers = Array.isArray(rows) ? rows : [];

    let totalCustomers = customers.length;
    let activeCustomers = 0;
    let newCustomers = 0;
    let marketingCustomers = 0;

    for (const customer of customers) {
      const status = deriveCustomerStatus(customer);
      if (status === 'active') activeCustomers += 1;
      if (status === 'new') newCustomers += 1;

      const marketing = Number(customer.accepts_marketing || customer.marketing_opt_in || 0);
      if (marketing) marketingCustomers += 1;
    }

    return res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        newCustomers,
        marketingCustomers
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات العملاء:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات العملاء'
    });
  }
});

/**
 * GET /api/customers/:id
 */
router.get('/:id', async (req, res) => {
  try {
    await ensureCustomersTable();

    const customer = await getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    return res.json({
      success: true,
      data: {
        ...customer,
        status: deriveCustomerStatus(customer)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب العميل:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب العميل'
    });
  }
});

/**
 * POST /api/customers
 */
router.post('/', async (req, res) => {
  try {
    await ensureCustomersTable();

    const body = req.body || {};

    const fullName = normalizeText(body.full_name ?? body.fullName ?? body.name);
    const email = normalizeText(body.email);
    const phone = normalizeText(body.phone);
    const city = normalizeText(body.city);
    const area = normalizeText(body.area);
    const status = normalizeStatus(body.status) || 'new';
    const totalOrders = Math.max(0, toInteger(body.total_orders ?? body.totalOrders, 0));
    const totalSpent = Math.max(0, toNumber(body.total_spent ?? body.totalSpent, 0));
    const acceptsMarketing = normalizeBooleanFlag(body.accepts_marketing ?? body.acceptsMarketing, 0);
    const marketingOptIn = normalizeBooleanFlag(body.marketing_opt_in ?? body.marketingOptIn, acceptsMarketing);
    const lastOrderAt = normalizeText(body.last_order_at ?? body.lastOrderAt);
    const isBlocked = normalizeBooleanFlag(body.is_blocked ?? body.blocked, 0);
    const notes = normalizeText(body.notes);

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'اسم العميل مطلوب'
      });
    }

    await withTimeout(
      db.run(
        `INSERT INTO customers
        (
          full_name,
          email,
          phone,
          city,
          area,
          status,
          total_orders,
          total_spent,
          accepts_marketing,
          marketing_opt_in,
          last_order_at,
          is_blocked,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullName,
          email,
          phone,
          city,
          area,
          status,
          totalOrders,
          totalSpent,
          acceptsMarketing,
          marketingOptIn,
          lastOrderAt || null,
          isBlocked,
          notes
        ]
      ),
      DB_OP_TIMEOUT_MS,
      'insertCustomer'
    );

    const created = await withTimeout(
      db.get(`SELECT * FROM customers ORDER BY id DESC LIMIT 1`),
      DB_OP_TIMEOUT_MS,
      'selectCreatedCustomer'
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء العميل بنجاح',
      data: {
        ...created,
        status: deriveCustomerStatus(created)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء العميل:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء العميل'
    });
  }
});

/**
 * PUT /api/customers/:id
 */
router.put('/:id', async (req, res) => {
  try {
    await ensureCustomersTable();

    const { id } = req.params;
    const current = await getCustomerById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    const body = req.body || {};
    const updateFields = [];
    const updateValues = [];

    if (body.full_name !== undefined || body.fullName !== undefined || body.name !== undefined) {
      const fullName = normalizeText(body.full_name ?? body.fullName ?? body.name);
      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: 'اسم العميل غير صحيح'
        });
      }
      updateFields.push('full_name = ?');
      updateValues.push(fullName);
    }

    if (body.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(normalizeText(body.email));
    }

    if (body.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(normalizeText(body.phone));
    }

    if (body.city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(normalizeText(body.city));
    }

    if (body.area !== undefined) {
      updateFields.push('area = ?');
      updateValues.push(normalizeText(body.area));
    }

    if (body.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(normalizeStatus(body.status) || 'new');
    }

    if (body.total_orders !== undefined || body.totalOrders !== undefined) {
      updateFields.push('total_orders = ?');
      updateValues.push(Math.max(0, toInteger(body.total_orders ?? body.totalOrders, 0)));
    }

    if (body.total_spent !== undefined || body.totalSpent !== undefined) {
      updateFields.push('total_spent = ?');
      updateValues.push(Math.max(0, toNumber(body.total_spent ?? body.totalSpent, 0)));
    }

    if (body.accepts_marketing !== undefined || body.acceptsMarketing !== undefined) {
      updateFields.push('accepts_marketing = ?');
      updateValues.push(normalizeBooleanFlag(body.accepts_marketing ?? body.acceptsMarketing, 0));
    }

    if (body.marketing_opt_in !== undefined || body.marketingOptIn !== undefined) {
      updateFields.push('marketing_opt_in = ?');
      updateValues.push(normalizeBooleanFlag(body.marketing_opt_in ?? body.marketingOptIn, 0));
    }

    if (body.last_order_at !== undefined || body.lastOrderAt !== undefined) {
      updateFields.push('last_order_at = ?');
      updateValues.push(normalizeText(body.last_order_at ?? body.lastOrderAt) || null);
    }

    if (body.is_blocked !== undefined || body.blocked !== undefined) {
      updateFields.push('is_blocked = ?');
      updateValues.push(normalizeBooleanFlag(body.is_blocked ?? body.blocked, 0));
    }

    if (body.notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(normalizeText(body.notes));
    }

    if (!updateFields.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await withTimeout(
      db.run(
        `UPDATE customers
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      DB_OP_TIMEOUT_MS,
      'updateCustomer'
    );

    const updated = await getCustomerById(id);

    return res.json({
      success: true,
      message: 'تم تحديث العميل بنجاح',
      data: {
        ...updated,
        status: deriveCustomerStatus(updated)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث العميل:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث العميل'
    });
  }
});

/**
 * DELETE /api/customers/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await ensureCustomersTable();

    const customer = await getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'العميل غير موجود'
      });
    }

    await withTimeout(
      db.run(`DELETE FROM customers WHERE id = ?`, [req.params.id]),
      DB_OP_TIMEOUT_MS,
      'deleteCustomer'
    );

    return res.json({
      success: true,
      message: 'تم حذف العميل بنجاح',
      data: {
        deletedCustomerId: customer.id,
        deletedCustomerName: customer.full_name
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف العميل:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف العميل'
    });
  }
});

/**
 * GET /api/customers
 */
router.get('/', async (req, res) => {
  try {
    await ensureCustomersTable();

    const {
      status,
      search,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    let normalizedStatusFilter = null;

    if (status) {
      normalizedStatusFilter = parseCustomerStatusFilter(status);
      if (!normalizedStatusFilter) {
        return res.status(400).json({
          success: false,
          error: 'قيمة status غير صحيحة. القيم المسموحة: active, new, inactive, blocked'
        });
      }
    }

    const rows = await withTimeout(
      db.all(`SELECT * FROM customers`),
      DB_OP_TIMEOUT_MS,
      'listCustomers'
    );
    let customers = Array.isArray(rows) ? rows : [];

    customers = customers.map(customer => ({
      ...customer,
      status: deriveCustomerStatus(customer)
    }));

    if (normalizedStatusFilter) {
      customers = customers.filter(customer => customer.status === normalizedStatusFilter);
    }

    if (search) {
      const clipped = String(search).trim().slice(0, MAX_SEARCH_LEN).toLowerCase();
      if (clipped) {
        customers = customers.filter(customer => {
          const haystack = [
            customer.full_name,
            customer.email,
            customer.phone,
            customer.city,
            customer.area
          ].map(v => String(v || '').toLowerCase()).join(' ');
          return haystack.includes(clipped);
        });
      }
    }

    const sortKey = String(sort || 'created_at');
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    customers.sort((a, b) => {
      let av;
      let bv;

      switch (sortKey) {
        case 'full_name':
          av = String(a.full_name || '').toLowerCase();
          bv = String(b.full_name || '').toLowerCase();
          break;
        case 'total_orders':
          av = Number(a.total_orders || 0);
          bv = Number(b.total_orders || 0);
          break;
        case 'total_spent':
          av = Number(a.total_spent || 0);
          bv = Number(b.total_spent || 0);
          break;
        case 'created_at':
        default:
          av = new Date(a.created_at || 0).getTime();
          bv = new Date(b.created_at || 0).getTime();
          break;
      }

      if (av < bv) return sortOrder === 'ASC' ? -1 : 1;
      if (av > bv) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    const parsedLimit = Math.max(1, toInteger(limit, 50));
    const parsedOffset = Math.max(0, toInteger(offset, 0));
    const total = customers.length;

    const paginated = customers.slice(parsedOffset, parsedOffset + parsedLimit);

    return res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / Math.max(1, parsedLimit))
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب العملاء:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({
        success: false,
        error: 'الاستعلام استغرق وقتاً طويلاً. حاول مرة أخرى لاحقاً.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'فشل في جلب العملاء'
    });
  }
});

module.exports = router;