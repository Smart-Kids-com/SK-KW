const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

/**
 * Guardrails (prevent Vercel timeouts + huge payloads)
 */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const MAX_COLLECTIONS_LIST_LIMIT = 200;
const MAX_SEARCH_LEN = 80;
const DB_OP_TIMEOUT_MS = 12_000;
const COLLECTION_STATUSES = ['active', 'draft', 'archived'];

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
function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeText(value = '') {
  return String(value || '').trim();
}

function normalizeStatus(status) {
  const raw = String(status || '').trim().toLowerCase();
  return COLLECTION_STATUSES.includes(raw) ? raw : 'active';
}

function parseStatusFilter(status) {
  const raw = String(status || '').trim().toLowerCase();
  return COLLECTION_STATUSES.includes(raw) ? raw : null;
}

function normalizeSortMode(sortMode) {
  const allowed = [
    'manual',
    'best_selling',
    'title_asc',
    'title_desc',
    'price_desc',
    'price_asc',
    'newest',
    'oldest'
  ];

  const raw = String(sortMode || '').trim();
  return allowed.includes(raw) ? raw : 'manual';
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
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

function parseIncludeProductsFlag(req, defaultValue = false) {
  // القيم المقبولة للتفعيل: 1/true/yes/on، وللتعطيل: 0/false/no/off، وأي قيمة أخرى => defaultValue
  const raw = req.query.includeProducts;
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  const text = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return defaultValue;
}

async function makeUniqueSlug(baseText = '', excludeId = null) {
  const base = slugify(baseText) || `collection-${Date.now()}`;
  let candidate = base;
  let index = 2;

  while (true) {
    const existing = excludeId
      ? await withTimeout(
          db.get(`SELECT id FROM collections WHERE slug = ? AND id != ?`, [candidate, excludeId]),
          DB_OP_TIMEOUT_MS,
          'makeUniqueSlug(exclude)'
        )
      : await withTimeout(
          db.get(`SELECT id FROM collections WHERE slug = ?`, [candidate]),
          DB_OP_TIMEOUT_MS,
          'makeUniqueSlug'
        );

    if (!existing) return candidate;

    candidate = `${base}-${index}`;
    index += 1;
  }
}

function normalizeIncomingCollectionBody(body = {}) {
  return {
    title: body.title ?? body.name ?? '',
    slug: body.slug ?? body.handle ?? '',
    description: body.description ?? '',
    imageUrl: body.imageUrl ?? body.image_url ?? body.image ?? '',
    sortMode: body.sortMode ?? body.sort_mode ?? 'manual',
    status: body.status ?? 'active',
    themeTemplate: body.themeTemplate ?? body.theme_template ?? 'default-collection',
    seoTitle: body.seoTitle ?? body.seo_title ?? '',
    seoDescription: body.seoDescription ?? body.seo_description ?? '',
    onlineStore: body.onlineStore ?? body.online_store ?? true,
    posExcluded: body.posExcluded ?? body.pos_excluded ?? true,
    productIds: Array.isArray(body.productIds)
      ? body.productIds
      : Array.isArray(body.products)
        ? body.products.map(item => item?.product_id ?? item?.id).filter(Boolean)
        : []
  };
}

async function getCollectionById(id) {
  return await withTimeout(
    db.get(`SELECT * FROM collections WHERE id = ?`, [id]),
    DB_OP_TIMEOUT_MS,
    'getCollectionById'
  );
}

async function getCollectionBySlug(slug) {
  return await withTimeout(
    db.get(`SELECT * FROM collections WHERE slug = ?`, [slug]),
    DB_OP_TIMEOUT_MS,
    'getCollectionBySlug'
  );
}

async function getCollectionProductCount(collectionId) {
  const row = await withTimeout(
    db.get(`SELECT COUNT(*) as count FROM collection_products WHERE collection_id = ?`, [collectionId]),
    DB_OP_TIMEOUT_MS,
    'getCollectionProductCount'
  );
  return Number(row?.count || 0);
}

function getOrderByForCollectionProducts(sortMode = 'manual') {
  const normalized = normalizeSortMode(sortMode);

  if (normalized === 'title_asc') return 'p.product_name ASC, p.id ASC';
  if (normalized === 'title_desc') return 'p.product_name DESC, p.id DESC';
  if (normalized === 'price_desc') return 'p.price DESC, p.id DESC';
  if (normalized === 'price_asc') return 'p.price ASC, p.id ASC';
  if (normalized === 'newest') return 'p.created_at DESC, p.id DESC';
  if (normalized === 'oldest') return 'p.created_at ASC, p.id ASC';

  // manual / default
  return 'cp.sort_order ASC, cp.id ASC';
}

/**
 * Stronger paging strategy to avoid timeouts + "empty data with non-zero total":
 *
 * - For manual:
 *   1) COUNT(*) from collection_products (cheap)
 *   2) Page from collection_products ONLY (product_id + sort_order)
 *   3) Fetch products by IN (...)
 *   4) Reorder in-memory to match collection_products order
 *   5) If some product IDs are missing in products table, return placeholder rows
 *      so the UI doesn't show an empty list while total>0.
 *
 * - For other sort modes:
 *   Ordering depends on product fields, so we keep a join, but keep selected columns minimal.
 */
async function getCollectionProductsPaged(collectionId, sortMode = 'manual', limit = DEFAULT_LIMIT, offset = 0) {
  const normalizedSort = normalizeSortMode(sortMode);

  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, toInteger(limit, DEFAULT_LIMIT)));
  const parsedOffset = Math.max(0, toInteger(offset, 0));

  // Always compute total from the link table (cheap + stable)
  const countRow = await withTimeout(
    db.get(`SELECT COUNT(*) as total FROM collection_products WHERE collection_id = ?`, [collectionId]),
    DB_OP_TIMEOUT_MS,
    'countCollectionProducts'
  );
  const total = Number(countRow?.total || 0);

  const pagination = {
    total,
    limit: parsedLimit,
    offset: parsedOffset,
    totalPages: parsedLimit ? Math.ceil(total / parsedLimit) : 1
  };

  if (total === 0) {
    return { rows: [], pagination };
  }

  // If offset is beyond total, return empty page (prevents "stuck" pages)
  if (parsedOffset >= total) {
    return { rows: [], pagination };
  }

  // ✅ Manual mode: NO JOIN in paging query.
  if (normalizedSort === 'manual') {
    // 1) Page links
    const linkRows = await withTimeout(
      db.all(
        `
          SELECT product_id, sort_order
          FROM collection_products
          WHERE collection_id = ?
          ORDER BY sort_order ASC, id ASC
          LIMIT ? OFFSET ?
        `,
        [collectionId, parsedLimit, parsedOffset]
      ),
      DB_OP_TIMEOUT_MS,
      'getCollectionProductsPaged(manual.linksPage)'
    );

    const pageLinks = Array.isArray(linkRows) ? linkRows : [];
    const pageProductIds = pageLinks.map(r => Number(r.product_id)).filter(Boolean);

    if (!pageProductIds.length) {
      return { rows: [], pagination };
    }

    // 2) Fetch products by ids
    const placeholders = pageProductIds.map(() => '?').join(', ');
    const productRows = await withTimeout(
      db.all(
        `
          SELECT
            id,
            product_name,
            slug,
            sku,
            price,
            sale_price,
            image_url,
            stock,
            status,
            product_type,
            vendor,
            category,
            created_at,
            updated_at
          FROM products
          WHERE id IN (${placeholders})
        `,
        pageProductIds
      ),
      DB_OP_TIMEOUT_MS,
      'getCollectionProductsPaged(manual.productsByIds)'
    );

    const products = Array.isArray(productRows) ? productRows : [];
    const byId = new Map(products.map(p => [Number(p.id), p]));

    // 3) Reorder + placeholders for missing products
    const ordered = [];
    for (const link of pageLinks) {
      const pid = Number(link.product_id);
      const sortOrder = toInteger(link.sort_order, 0);
      const product = byId.get(pid);

      if (product) {
        ordered.push({
          collection_id: Number(collectionId),
          product_id: pid,
          sort_order: sortOrder,
          ...product
        });
        continue;
      }

      // Placeholder row (keeps UI from showing empty list while total>0)
      ordered.push({
        collection_id: Number(collectionId),
        product_id: pid,
        sort_order: sortOrder,
        id: pid,
        product_name: '[Missing product]',
        slug: '',
        sku: '',
        price: 0,
        sale_price: null,
        image_url: '',
        stock: 0,
        status: 'archived',
        product_type: '',
        vendor: '',
        category: '',
        created_at: null,
        updated_at: null
      });
    }

    return { rows: ordered, pagination };
  }

  // Other sort modes: ordering depends on product fields; keep join but minimal columns
  const orderBy = getOrderByForCollectionProducts(normalizedSort);

  const sql = `
    SELECT
      cp.collection_id,
      cp.product_id,
      cp.sort_order,
      p.id,
      p.product_name,
      p.slug,
      p.sku,
      p.price,
      p.sale_price,
      p.image_url,
      p.stock,
      p.status,
      p.product_type,
      p.vendor,
      p.category,
      p.created_at,
      p.updated_at
    FROM collection_products cp
    INNER JOIN products p ON p.id = cp.product_id
    WHERE cp.collection_id = ?
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const rows = await withTimeout(
    db.all(sql, [collectionId, parsedLimit, parsedOffset]),
    DB_OP_TIMEOUT_MS,
    'getCollectionProductsPaged(join)'
  );

  return {
    rows: Array.isArray(rows) ? rows : [],
    pagination
  };
}

async function enrichCollection(collection, includeProducts = false) {
  if (!collection) return null;

  const productCount = await getCollectionProductCount(collection.id);

  // لا نرجّع products افتراضيًا (مهم لـ Serverless)
  if (!includeProducts) {
    return {
      ...collection,
      product_count: productCount,
      products: []
    };
  }

  // لو حد طلب includeProducts=1: نرجّع أول صفحة فقط لتجنب payload ضخم
  const { rows } = await getCollectionProductsPaged(collection.id, collection.sort_mode || 'manual', 50, 0);

  return {
    ...collection,
    product_count: productCount,
    products: rows
  };
}

async function normalizeProductIds(productIds = []) {
  const ids = productIds
    .map(id => toInteger(id, 0))
    .filter(Boolean);

  if (!ids.length) return [];

  const uniqueIds = [...new Set(ids)];
  const valid = [];

  // NOTE: بطيء لو ids كثيرة جدًا، لكن في editor عادة معقول.
  // لو احتجنا نسرّعه: نجيبهم ب IN(...) مرة واحدة.
  for (const productId of uniqueIds) {
    const product = await withTimeout(
      db.get(`SELECT id FROM products WHERE id = ?`, [productId]),
      DB_OP_TIMEOUT_MS,
      'normalizeProductIds(checkProduct)'
    );
    if (product) valid.push(productId);
  }

  return valid;
}

async function reindexCollectionProducts(collectionId) {
  const rows = await withTimeout(
    db.all(
      `SELECT id FROM collection_products WHERE collection_id = ? ORDER BY sort_order ASC, id ASC`,
      [collectionId]
    ),
    DB_OP_TIMEOUT_MS,
    'reindexCollectionProducts(select)'
  );

  let index = 1;
  for (const row of rows) {
    await withTimeout(
      db.run(`UPDATE collection_products SET sort_order = ? WHERE id = ?`, [index, row.id]),
      DB_OP_TIMEOUT_MS,
      'reindexCollectionProducts(update)'
    );
    index += 1;
  }
}

async function addProductsToCollection(collectionId, productIds = [], position = 'bottom') {
  const ids = await normalizeProductIds(productIds);
  if (!ids.length) return;

  if (position === 'top') {
    const existingRows = await withTimeout(
      db.all(
        `SELECT id, sort_order FROM collection_products WHERE collection_id = ? ORDER BY sort_order ASC, id ASC`,
        [collectionId]
      ),
      DB_OP_TIMEOUT_MS,
      'addProductsToCollection(existingRows)'
    );

    const shiftBy = ids.length;
    for (const row of existingRows) {
      await withTimeout(
        db.run(
          `UPDATE collection_products SET sort_order = ? WHERE id = ?`,
          [toInteger(row.sort_order, 0) + shiftBy, row.id]
        ),
        DB_OP_TIMEOUT_MS,
        'addProductsToCollection(shift)'
      );
    }

    let order = 1;
    for (const productId of ids) {
      await withTimeout(
        db.run(
          `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
           VALUES (?, ?, ?)`,
          [collectionId, productId, order]
        ),
        DB_OP_TIMEOUT_MS,
        'addProductsToCollection(insertTop)'
      );
      order += 1;
    }

    await reindexCollectionProducts(collectionId);
    return;
  }

  const maxRow = await withTimeout(
    db.get(
      `SELECT MAX(sort_order) as maxOrder FROM collection_products WHERE collection_id = ?`,
      [collectionId]
    ),
    DB_OP_TIMEOUT_MS,
    'addProductsToCollection(maxOrder)'
  );

  let nextOrder = Number(maxRow?.maxOrder || 0) + 1;

  for (const productId of ids) {
    await withTimeout(
      db.run(
        `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
         VALUES (?, ?, ?)`,
        [collectionId, productId, nextOrder]
      ),
      DB_OP_TIMEOUT_MS,
      'addProductsToCollection(insertBottom)'
    );
    nextOrder += 1;
  }

  await reindexCollectionProducts(collectionId);
}

/**
 * GET /api/collections/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalCollections,
      activeCollections,
      draftCollections,
      archivedCollections,
      totalLinks
    ] = await Promise.all([
      withTimeout(db.get(`SELECT COUNT(*) as count FROM collections`), DB_OP_TIMEOUT_MS, 'countCollections(total)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'active'`), DB_OP_TIMEOUT_MS, 'countCollections(active)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'draft'`), DB_OP_TIMEOUT_MS, 'countCollections(draft)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'archived'`), DB_OP_TIMEOUT_MS, 'countCollections(archived)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM collection_products`), DB_OP_TIMEOUT_MS, 'countCollectionProducts(total)')
    ]);

    return res.json({
      success: true,
      data: {
        totalCollections: Number(totalCollections?.count || 50),
        activeCollections: Number(activeCollections?.count || 50),
        draftCollections: Number(draftCollections?.count || 50),
        archivedCollections: Number(archivedCollections?.count || 50),
        totalCollectionProducts: Number(totalLinks?.count || 50)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المجموعات:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في جلب إحصائيات المجموعات' });
  }
});

/**
 * GET /api/collections/slug/:slug
 * Optional query: includeProducts=0|1 (default 0)
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const collection = await getCollectionBySlug(req.params.slug);

    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const includeProducts = parseIncludeProductsFlag(req, false);
    const enriched = await enrichCollection(collection, includeProducts);

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('❌ خطأ في جلب المجموعة بالـ slug:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في جلب المجموعة' });
  }
});

/**
 * POST /api/collections
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      imageUrl,
      sortMode,
      status,
      themeTemplate,
      seoTitle,
      seoDescription,
      onlineStore,
      posExcluded,
      productIds
    } = normalizeIncomingCollectionBody(req.body);

    if (!title || normalizeText(title) === '') {
      return res.status(400).json({ success: false, error: 'عنوان المجموعة مطلوب' });
    }

    const finalTitle = normalizeText(title);
    const finalSlug = await makeUniqueSlug(slug || finalTitle);
    const finalStatus = normalizeStatus(status);
    const finalSortMode = normalizeSortMode(sortMode);
    const finalProductIds = await normalizeProductIds(productIds);

    await withTimeout(
      db.run(
        `INSERT INTO collections
        (
          title,
          slug,
          description,
          image_url,
          sort_mode,
          status,
          theme_template,
          seo_title,
          seo_description,
          online_store,
          pos_excluded
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalTitle,
          finalSlug,
          normalizeText(description),
          normalizeText(imageUrl),
          finalSortMode,
          finalStatus,
          normalizeText(themeTemplate) || 'default-collection',
          normalizeText(seoTitle),
          normalizeText(seoDescription),
          normalizeBooleanFlag(onlineStore, true),
          normalizeBooleanFlag(posExcluded, true)
        ]
      ),
      DB_OP_TIMEOUT_MS,
      'insertCollection'
    );

    const savedCollection = await getCollectionBySlug(finalSlug);

    if (savedCollection && finalProductIds.length) {
      let order = 1;
      for (const productId of finalProductIds) {
        await withTimeout(
          db.run(
            `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
             VALUES (?, ?, ?)`,
            [savedCollection.id, productId, order]
          ),
          DB_OP_TIMEOUT_MS,
          'insertCollectionProduct'
        );
        order += 1;
      }
    }

    const enriched = await enrichCollection(savedCollection, false);
    return res.status(201).json({ success: true, message: 'تم إنشاء المجموعة بنجاح', data: enriched });
  } catch (error) {
    console.error('❌ خطأ في إنشاء المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في إنشاء المجموعة' });
  }
});

/**
 * POST /api/collections/:id/duplicate
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const duplicatedTitle = `${collection.title} - Copy`;
    const duplicatedSlug = await makeUniqueSlug(duplicatedTitle);

    await withTimeout(
      db.run(
        `INSERT INTO collections
        (
          title,
          slug,
          description,
          image_url,
          sort_mode,
          status,
          theme_template,
          seo_title,
          seo_description,
          online_store,
          pos_excluded
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          duplicatedTitle,
          duplicatedSlug,
          collection.description || '',
          collection.image_url || '',
          collection.sort_mode || 'manual',
          collection.status || 'draft',
          collection.theme_template || 'default-collection',
          collection.seo_title || '',
          collection.seo_description || '',
          toInteger(collection.online_store, 1),
          toInteger(collection.pos_excluded, 1)
        ]
      ),
      DB_OP_TIMEOUT_MS,
      'duplicateCollection(insert)'
    );

    const duplicatedCollection = await getCollectionBySlug(duplicatedSlug);

    const linkedProducts = await withTimeout(
      db.all(
        `SELECT product_id, sort_order
         FROM collection_products
         WHERE collection_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [collection.id]
      ),
      DB_OP_TIMEOUT_MS,
      'duplicateCollection(selectLinks)'
    );

    for (const row of linkedProducts) {
      await withTimeout(
        db.run(
          `INSERT INTO collection_products (collection_id, product_id, sort_order)
           VALUES (?, ?, ?)`,
          [duplicatedCollection.id, row.product_id, row.sort_order]
        ),
        DB_OP_TIMEOUT_MS,
        'duplicateCollection(insertLink)'
      );
    }

    const enriched = await enrichCollection(duplicatedCollection, false);
    return res.status(201).json({ success: true, message: 'تم عمل نسخة من المجموعة بنجاح', data: enriched });
  } catch (error) {
    console.error('❌ خطأ في نسخ المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في نسخ المجموعة' });
  }
});

/**
 * GET /api/collections/:id/products
 * Query: sort, limit, offset
 */
router.get('/:id/products', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const sortMode = normalizeSortMode(req.query.sort || collection.sort_mode || 'manual');

    // Harden limit/offset parsing (prevent huge payloads / slow queries)
    // IMPORTANT: do NOT force a minimum of 50; that defeats pagination and can cause timeouts.
    const limit = Math.min(MAX_LIMIT, Math.max(1, toInteger(req.query.limit, DEFAULT_LIMIT)));
    const offset = Math.max(0, toInteger(req.query.offset, 0));

    const { rows, pagination } = await getCollectionProductsPaged(collection.id, sortMode, limit, offset);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        ...pagination,
        sort: sortMode
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({
        success: false,
        error: 'الاستعلام استغرق وقتًا طويلاً. حاول تقليل limit.'
      });
    }

    return res.status(500).json({ success: false, error: 'فشل في ��لب منتجات المجموعة' });
  }
});

/**
 * POST /api/collections/:id/products/add
 */
router.post('/:id/products/add', async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds = [], position = 'bottom' } = req.body || {};

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    await addProductsToCollection(id, productIds, position === 'top' ? 'top' : 'bottom');

    return res.json({
      success: true,
      message: 'تمت إضافة المنتجات إلى المجموعة'
    });
  } catch (error) {
    console.error('❌ خطأ في إضافة منتجات للمجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في إضافة المنتجات إلى المجموعة' });
  }
});

/**
 * POST /api/collections/:id/products/remove
 */
router.post('/:id/products/remove', async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds = [] } = req.body || {};

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const ids = await normalizeProductIds(productIds);

    if (!ids.length) {
      return res.status(400).json({ success: false, error: 'لم يتم تحديد منتجات للحذف' });
    }

    for (const productId of ids) {
      await withTimeout(
        db.run(`DELETE FROM collection_products WHERE collection_id = ? AND product_id = ?`, [id, productId]),
        DB_OP_TIMEOUT_MS,
        'removeCollectionProduct'
      );
    }

    await reindexCollectionProducts(id);

    return res.json({ success: true, message: 'تم حذف المنتجات من المجموعة' });
  } catch (error) {
    console.error('❌ خطأ في حذف منتجات من المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام ا��تغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في حذف المنتجات من المجموعة' });
  }
});

/**
 * POST /api/collections/:id/products/reorder
 */
router.post('/:id/products/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body || {};

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, error: 'بيانات الت��تيب غير صحيحة' });
    }

    for (const item of items) {
      const productId = toInteger(item.productId, 0);
      const sortOrder = toInteger(item.sortOrder, 0);
      if (!productId || !sortOrder) continue;

      await withTimeout(
        db.run(
          `UPDATE collection_products
           SET sort_order = ?
           WHERE collection_id = ? AND product_id = ?`,
          [sortOrder, id, productId]
        ),
        DB_OP_TIMEOUT_MS,
        'reorderCollectionProducts(update)'
      );
    }

    await reindexCollectionProducts(id);

    // رجّع أول صفحة فقط
    const { rows, pagination } = await getCollectionProductsPaged(id, 'manual', DEFAULT_LIMIT, 0);

    return res.json({
      success: true,
      message: 'تم تحديث ترتيب المنتجات',
      data: rows,
      pagination
    });
  } catch (error) {
    console.error('❌ خطأ في إعادة ترتيب المنتجات:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في إعادة ترتيب المنتجات' });
  }
});

/**
 * POST /api/collections/:id/products/move
 */
router.post('/:id/products/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds = [], destination = 'top', position = 1 } = req.body || {};

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const ids = await normalizeProductIds(productIds);

    if (!ids.length) {
      return res.status(400).json({ success: false, error: 'لم يتم تحديد منتجات للنقل' });
    }

    const currentRows = await withTimeout(
      db.all(
        `SELECT product_id
         FROM collection_products
         WHERE collection_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [id]
      ),
      DB_OP_TIMEOUT_MS,
      'moveCollectionProducts(selectCurrent)'
    );

    let orderedIds = currentRows.map(row => Number(row.product_id));
    orderedIds = orderedIds.filter(productId => !ids.includes(productId));

    if (destination === 'top') {
      orderedIds = [...ids, ...orderedIds];
    } else if (destination === 'bottom') {
      orderedIds = [...orderedIds, ...ids];
    } else {
      const targetPosition = Math.max(1, toInteger(position, 1));
      const insertIndex = Math.min(targetPosition - 1, orderedIds.length);
      orderedIds.splice(insertIndex, 0, ...ids);
    }

    let order = 1;
    for (const productId of orderedIds) {
      await withTimeout(
        db.run(
          `UPDATE collection_products
           SET sort_order = ?
           WHERE collection_id = ? AND product_id = ?`,
          [order, id, productId]
        ),
        DB_OP_TIMEOUT_MS,
        'moveCollectionProducts(updateOrder)'
      );
      order += 1;
    }

    await reindexCollectionProducts(id);

    // رجّع أول صفحة فقط
    const { rows, pagination } = await getCollectionProductsPaged(id, 'manual', DEFAULT_LIMIT, 0);

    return res.json({
      success: true,
      message: 'تم نقل المنتجات بنجاح',
      data: rows,
      pagination
    });
  } catch (error) {
    console.error('❌ خطأ في نقل المنتجات داخل المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في نقل المنتجات' });
  }
});

/**
 * GET /api/collections/:id
 * Optional query: includeProducts=0|1 (default 0)
 */
router.get('/:id', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const includeProducts = parseIncludeProductsFlag(req, false);
    const enriched = await enrichCollection(collection, includeProducts);

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('❌ خطأ في جلب المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام اس��غرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في جلب المجموعة' });
  }
});

/**
 * PUT /api/collections/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      imageUrl,
      sortMode,
      status,
      themeTemplate,
      seoTitle,
      seoDescription,
      onlineStore,
      posExcluded
    } = normalizeIncomingCollectionBody(req.body);

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined && req.body.title !== undefined) {
      const finalTitle = normalizeText(title);
      if (!finalTitle) {
        return res.status(400).json({ success: false, error: 'عنوان المجموعة غير صحيح' });
      }
      updateFields.push('title = ?');
      updateValues.push(finalTitle);
    }

    if (slug !== undefined && (req.body.slug !== undefined || req.body.handle !== undefined)) {
      const finalSlug = await makeUniqueSlug(slug || collection.title, id);
      updateFields.push('slug = ?');
      updateValues.push(finalSlug);
    }

    if (description !== undefined && req.body.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(normalizeText(description));
    }

    if (imageUrl !== undefined && (req.body.imageUrl !== undefined || req.body.image_url !== undefined || req.body.image !== undefined)) {
      updateFields.push('image_url = ?');
      updateValues.push(normalizeText(imageUrl));
    }

    if (sortMode !== undefined && (req.body.sortMode !== undefined || req.body.sort_mode !== undefined)) {
      updateFields.push('sort_mode = ?');
      updateValues.push(normalizeSortMode(sortMode));
    }

    if (status !== undefined && req.body.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(normalizeStatus(status));
    }

    if (themeTemplate !== undefined && (req.body.themeTemplate !== undefined || req.body.theme_template !== undefined)) {
      updateFields.push('theme_template = ?');
      updateValues.push(normalizeText(themeTemplate) || 'default-collection');
    }

    if (seoTitle !== undefined && (req.body.seoTitle !== undefined || req.body.seo_title !== undefined)) {
      updateFields.push('seo_title = ?');
      updateValues.push(normalizeText(seoTitle));
    }

    if (seoDescription !== undefined && (req.body.seoDescription !== undefined || req.body.seo_description !== undefined)) {
      updateFields.push('seo_description = ?');
      updateValues.push(normalizeText(seoDescription));
    }

    if (req.body.onlineStore !== undefined || req.body.online_store !== undefined) {
      updateFields.push('online_store = ?');
      updateValues.push(normalizeBooleanFlag(onlineStore, true));
    }

    if (req.body.posExcluded !== undefined || req.body.pos_excluded !== undefined) {
      updateFields.push('pos_excluded = ?');
      updateValues.push(normalizeBooleanFlag(posExcluded, true));
    }

    if (!updateFields.length) {
      return res.status(400).json({ success: false, error: 'لا توجد بيانات للتحديث' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await withTimeout(
      db.run(
        `UPDATE collections
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      DB_OP_TIMEOUT_MS,
      'updateCollection'
    );

    const updated = await getCollectionById(id);
    const enriched = await enrichCollection(updated, false);

    return res.json({ success: true, message: 'تم تحديث المجموعة بنجاح', data: enriched });
  } catch (error) {
    console.error('❌ خطأ في تحديث المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في تحديث المجموعة' });
  }
});

/**
 * DELETE /api/collections/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    await withTimeout(db.run(`DELETE FROM collection_products WHERE collection_id = ?`, [req.params.id]), DB_OP_TIMEOUT_MS, 'deleteCollectionLinks');
    await withTimeout(db.run(`DELETE FROM collections WHERE id = ?`, [req.params.id]), DB_OP_TIMEOUT_MS, 'deleteCollection');

    return res.json({
      success: true,
      message: 'تم حذف المجموعة بنجاح',
      data: {
        deletedCollectionId: collection.id,
        deletedCollectionTitle: collection.title
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف المجموعة:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في حذف المجموعة' });
  }
});

/**
 * GET /api/collections
 * Returns collections metadata + product_count only (no products list).
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      search,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    let sql = `SELECT * FROM collections`;
    const params = [];
    const where = [];
    let normalizedStatus = null;

    if (status) {
      normalizedStatus = parseStatusFilter(status);
      if (!normalizedStatus) {
        return res.status(400).json({ success: false, error: 'قيمة status غير صحيحة. القيم المسموحة: active, draft, archived' });
      }
      where.push(`status = ?`);
      params.push(normalizedStatus);
    }

    if (search) {
      const clipped = String(search).trim().slice(0, MAX_SEARCH_LEN);
      const searchValue = `%${clipped}%`;

      where.push(`(
        title LIKE ?
        OR slug LIKE ?
        OR description LIKE ?
        OR seo_title LIKE ?
        OR seo_description LIKE ?
      )`);

      params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    const validSortColumns = ['created_at', 'updated_at', 'title', 'status'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;

    const parsedLimit = Math.min(MAX_COLLECTIONS_LIST_LIMIT, Math.max(1, toInteger(limit, 25)));
    const parsedOffset = Math.max(0, toInteger(offset, 0));

    params.push(parsedLimit, parsedOffset);

    const collections = await withTimeout(db.all(sql, params), DB_OP_TIMEOUT_MS, 'listCollections');

    // enrich with product_count only (fast enough)
    const enrichedCollections = [];
    for (const collection of collections) {
      enrichedCollections.push(await enrichCollection(collection, false));
    }

    let countSql = `SELECT COUNT(*) as total FROM collections`;
    const countParams = [];

    if (where.length > 0) {
      countSql += ` WHERE ${where.join(' AND ')}`;

      if (normalizedStatus) {
        countParams.push(normalizedStatus);
      }

      if (search) {
        const clipped = String(search).trim().slice(0, MAX_SEARCH_LEN);
        const searchValue = `%${clipped}%`;
        countParams.push(searchValue, searchValue, searchValue, searchValue, searchValue);
      }
    }

    const countResult = await withTimeout(db.get(countSql, countParams), DB_OP_TIMEOUT_MS, 'countCollections');
    const total = Number(countResult?.total || 0);

    return res.json({
      success: true,
      data: enrichedCollections,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / Math.max(1, parsedLimit))
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المجموعات:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({ success: false, error: 'الاستعلام استغرق وقتًا طويلاً.' });
    }

    return res.status(500).json({ success: false, error: 'فشل في جلب المجموعات' });
  }
});

module.exports = router;