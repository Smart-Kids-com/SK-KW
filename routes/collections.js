const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

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
  const allowed = ['active', 'draft', 'archived'];
  return allowed.includes(status) ? status : 'active';
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

  return allowed.includes(sortMode) ? sortMode : 'manual';
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
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

async function makeUniqueSlug(baseText = '', excludeId = null) {
  const base = slugify(baseText) || `collection-${Date.now()}`;
  let candidate = base;
  let index = 2;

  while (true) {
    const existing = excludeId
      ? await db.get(`SELECT id FROM collections WHERE slug = ? AND id != ?`, [candidate, excludeId])
      : await db.get(`SELECT id FROM collections WHERE slug = ?`, [candidate]);

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
  return await db.get(`SELECT * FROM collections WHERE id = ?`, [id]);
}

async function getCollectionProductCount(collectionId) {
  const row = await db.get(
    `SELECT COUNT(*) as count FROM collection_products WHERE collection_id = ?`,
    [collectionId]
  );

  return Number(row?.count || 0);
}

async function getCollectionProducts(collectionId, sortMode = 'manual') {
  let orderBy = 'cp.sort_order ASC, cp.id ASC';

  if (sortMode === 'title_asc') orderBy = 'p.product_name ASC, p.id ASC';
  if (sortMode === 'title_desc') orderBy = 'p.product_name DESC, p.id DESC';
  if (sortMode === 'price_desc') orderBy = 'p.price DESC, p.id DESC';
  if (sortMode === 'price_asc') orderBy = 'p.price ASC, p.id ASC';
  if (sortMode === 'newest') orderBy = 'p.created_at DESC, p.id DESC';
  if (sortMode === 'oldest') orderBy = 'p.created_at ASC, p.id ASC';

  const sql = `
    SELECT
      cp.id AS collection_product_id,
      cp.collection_id,
      cp.product_id,
      cp.sort_order,
      p.id,
      p.product_name,
      p.slug,
      p.sku,
      p.description,
      p.price,
      p.sale_price,
      p.image_url,
      p.stock,
      p.status,
      p.product_type,
      p.vendor,
      p.category,
      p.tags,
      p.seo_title,
      p.seo_description,
      p.created_at,
      p.updated_at
    FROM collection_products cp
    INNER JOIN products p ON p.id = cp.product_id
    WHERE cp.collection_id = ?
    ORDER BY ${orderBy}
  `;

  return await db.all(sql, [collectionId]);
}

async function enrichCollection(collection, includeProducts = true) {
  if (!collection) return null;

  const productCount = await getCollectionProductCount(collection.id);
  const products = includeProducts
    ? await getCollectionProducts(collection.id, collection.sort_mode || 'manual')
    : [];

  return {
    ...collection,
    product_count: productCount,
    products
  };
}

async function normalizeProductIds(productIds = []) {
  const ids = productIds
    .map(id => toInteger(id, 0))
    .filter(Boolean);

  if (!ids.length) return [];

  const uniqueIds = [...new Set(ids)];
  const valid = [];

  for (const productId of uniqueIds) {
    const product = await db.get(`SELECT id FROM products WHERE id = ?`, [productId]);
    if (product) valid.push(productId);
  }

  return valid;
}

async function reindexCollectionProducts(collectionId) {
  const rows = await db.all(
    `SELECT id FROM collection_products WHERE collection_id = ? ORDER BY sort_order ASC, id ASC`,
    [collectionId]
  );

  let index = 1;
  for (const row of rows) {
    await db.run(
      `UPDATE collection_products SET sort_order = ? WHERE id = ?`,
      [index, row.id]
    );
    index += 1;
  }
}

async function addProductsToCollection(collectionId, productIds = [], position = 'bottom') {
  const ids = await normalizeProductIds(productIds);
  if (!ids.length) return;

  if (position === 'top') {
    const existingRows = await db.all(
      `SELECT id, sort_order FROM collection_products WHERE collection_id = ? ORDER BY sort_order ASC, id ASC`,
      [collectionId]
    );

    const shiftBy = ids.length;
    for (const row of existingRows) {
      await db.run(
        `UPDATE collection_products SET sort_order = ? WHERE id = ?`,
        [toInteger(row.sort_order, 0) + shiftBy, row.id]
      );
    }

    let order = 1;
    for (const productId of ids) {
      await db.run(
        `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
         VALUES (?, ?, ?)`,
        [collectionId, productId, order]
      );
      order += 1;
    }

    await reindexCollectionProducts(collectionId);
    return;
  }

  const maxRow = await db.get(
    `SELECT MAX(sort_order) as maxOrder FROM collection_products WHERE collection_id = ?`,
    [collectionId]
  );

  let nextOrder = Number(maxRow?.maxOrder || 0) + 1;

  for (const productId of ids) {
    await db.run(
      `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
       VALUES (?, ?, ?)`,
      [collectionId, productId, nextOrder]
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
    const totalCollections = await db.get(`SELECT COUNT(*) as count FROM collections`);
    const activeCollections = await db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'active'`);
    const draftCollections = await db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'draft'`);
    const archivedCollections = await db.get(`SELECT COUNT(*) as count FROM collections WHERE status = 'archived'`);
    const totalLinks = await db.get(`SELECT COUNT(*) as count FROM collection_products`);

    return res.json({
      success: true,
      data: {
        totalCollections: Number(totalCollections?.count || 0),
        activeCollections: Number(activeCollections?.count || 0),
        draftCollections: Number(draftCollections?.count || 0),
        archivedCollections: Number(archivedCollections?.count || 0),
        totalCollectionProducts: Number(totalLinks?.count || 0)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المجموعات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المجموعات'
    });
  }
});

/**
 * GET /api/collections/slug/:slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const collection = await db.get(
      `SELECT * FROM collections WHERE slug = ?`,
      [req.params.slug]
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const enriched = await enrichCollection(collection, true);

    return res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المجموعة بالـ slug:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المجموعة'
    });
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
      return res.status(400).json({
        success: false,
        error: 'عنوان المجموعة مطلوب'
      });
    }

    const finalTitle = normalizeText(title);
    const finalSlug = await makeUniqueSlug(slug || finalTitle);
    const finalStatus = normalizeStatus(status);
    const finalSortMode = normalizeSortMode(sortMode);
    const finalProductIds = await normalizeProductIds(productIds);

    await db.run(
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
    );

    const savedCollection = await db.get(
      `SELECT * FROM collections WHERE slug = ? ORDER BY id DESC LIMIT 1`,
      [finalSlug]
    );

    if (savedCollection && finalProductIds.length) {
      let order = 1;
      for (const productId of finalProductIds) {
        await db.run(
          `INSERT OR IGNORE INTO collection_products (collection_id, product_id, sort_order)
           VALUES (?, ?, ?)`,
          [savedCollection.id, productId, order]
        );
        order += 1;
      }
    }

    const enriched = await enrichCollection(savedCollection, true);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المجموعة بنجاح',
      data: enriched
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء المجموعة'
    });
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
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const duplicatedTitle = `${collection.title} - Copy`;
    const duplicatedSlug = await makeUniqueSlug(duplicatedTitle);

    await db.run(
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
    );

    const duplicatedCollection = await db.get(
      `SELECT * FROM collections WHERE slug = ?`,
      [duplicatedSlug]
    );

    const linkedProducts = await db.all(
      `SELECT product_id, sort_order
       FROM collection_products
       WHERE collection_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [collection.id]
    );

    for (const row of linkedProducts) {
      await db.run(
        `INSERT INTO collection_products (collection_id, product_id, sort_order)
         VALUES (?, ?, ?)`,
        [duplicatedCollection.id, row.product_id, row.sort_order]
      );
    }

    const enriched = await enrichCollection(duplicatedCollection, true);

    return res.status(201).json({
      success: true,
      message: 'تم عمل نسخة من المجموعة بنجاح',
      data: enriched
    });
  } catch (error) {
    console.error('❌ خطأ في نسخ المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في نسخ المجموعة'
    });
  }
});

/**
 * GET /api/collections/:id/products
 */
router.get('/:id/products', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const products = await getCollectionProducts(
      collection.id,
      normalizeSortMode(req.query.sort || collection.sort_mode || 'manual')
    );

    return res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('❌ خطأ في جلب منتجات المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب منتجات المجموعة'
    });
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
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    await addProductsToCollection(id, productIds, position === 'top' ? 'top' : 'bottom');

    const products = await getCollectionProducts(id, 'manual');

    return res.json({
      success: true,
      message: 'تمت إضافة المنتجات إلى المجموعة',
      data: products
    });
  } catch (error) {
    console.error('❌ خطأ في إضافة منتجات للمجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إضافة المنتجات إلى المجموعة'
    });
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
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const ids = await normalizeProductIds(productIds);

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم تحديد منتجات للحذف'
      });
    }

    for (const productId of ids) {
      await db.run(
        `DELETE FROM collection_products WHERE collection_id = ? AND product_id = ?`,
        [id, productId]
      );
    }

    await reindexCollectionProducts(id);

    return res.json({
      success: true,
      message: 'تم حذف المنتجات من المجموعة'
    });
  } catch (error) {
    console.error('❌ خطأ في حذف منتجات من المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف المنتجات من المجموعة'
    });
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
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'بيانات الترتيب غير صحيحة'
      });
    }

    for (const item of items) {
      const productId = toInteger(item.productId, 0);
      const sortOrder = toInteger(item.sortOrder, 0);

      if (!productId || !sortOrder) continue;

      await db.run(
        `UPDATE collection_products
         SET sort_order = ?
         WHERE collection_id = ? AND product_id = ?`,
        [sortOrder, id, productId]
      );
    }

    await reindexCollectionProducts(id);

    const products = await getCollectionProducts(id, 'manual');

    return res.json({
      success: true,
      message: 'تم تحديث ترتيب المنتجات',
      data: products
    });
  } catch (error) {
    console.error('❌ خطأ في إعادة ترتيب المنتجات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إعادة ترتيب المنتجات'
    });
  }
});

/**
 * POST /api/collections/:id/products/move
 * body:
 * {
 *   productIds: [1,2,3],
 *   destination: 'top' | 'bottom' | 'position',
 *   position: 4
 * }
 */
router.post('/:id/products/move', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productIds = [],
      destination = 'top',
      position = 1
    } = req.body || {};

    const collection = await getCollectionById(id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const ids = await normalizeProductIds(productIds);

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم تحديد منتجات للنقل'
      });
    }

    const currentRows = await db.all(
      `SELECT product_id
       FROM collection_products
       WHERE collection_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [id]
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
      await db.run(
        `UPDATE collection_products
         SET sort_order = ?
         WHERE collection_id = ? AND product_id = ?`,
        [order, id, productId]
      );
      order += 1;
    }

    await reindexCollectionProducts(id);

    const products = await getCollectionProducts(id, 'manual');

    return res.json({
      success: true,
      message: 'تم نقل المنتجات بنجاح',
      data: products
    });
  } catch (error) {
    console.error('❌ خطأ في نقل المنتجات داخل المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في نقل المنتجات'
    });
  }
});

/**
 * GET /api/collections/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const enriched = await enrichCollection(collection, true);

    return res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المجموعة'
    });
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
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined && req.body.title !== undefined) {
      const finalTitle = normalizeText(title);
      if (!finalTitle) {
        return res.status(400).json({
          success: false,
          error: 'عنوان المجموعة غير صحيح'
        });
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
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(
      `UPDATE collections
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    const updated = await getCollectionById(id);
    const enriched = await enrichCollection(updated, true);

    return res.json({
      success: true,
      message: 'تم تحديث المجموعة بنجاح',
      data: enriched
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث المجموعة:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث المجموعة'
    });
  }
});

/**
 * DELETE /api/collections/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const collection = await getCollectionById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'المجموعة غير موجودة'
      });
    }

    await db.run(`DELETE FROM collection_products WHERE collection_id = ?`, [req.params.id]);
    await db.run(`DELETE FROM collections WHERE id = ?`, [req.params.id]);

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
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف المجموعة'
    });
  }
});

/**
 * GET /api/collections
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

    if (status) {
      where.push(`status = ?`);
      params.push(status);
    }

    if (search) {
      where.push(`(
        title LIKE ?
        OR slug LIKE ?
        OR description LIKE ?
        OR seo_title LIKE ?
        OR seo_description LIKE ?
      )`);

      const searchValue = `%${String(search).trim()}%`;
      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    const validSortColumns = [
      'created_at',
      'updated_at',
      'title',
      'status'
    ];

    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;

    const parsedLimit = Math.max(1, toInteger(limit, 50));
    const parsedOffset = Math.max(0, toInteger(offset, 0));

    params.push(parsedLimit, parsedOffset);

    const collections = await db.all(sql, params);
    const enrichedCollections = [];

    for (const collection of collections) {
      enrichedCollections.push(await enrichCollection(collection, false));
    }

    let countSql = `SELECT COUNT(*) as total FROM collections`;
    const countParams = [];

    if (where.length > 0) {
      countSql += ` WHERE ${where.join(' AND ')}`;

      if (status) countParams.push(status);

      if (search) {
        const searchValue = `%${String(search).trim()}%`;
        countParams.push(
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue
        );
      }
    }

    const countResult = await db.get(countSql, countParams);
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
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المجموعات'
    });
  }
});

module.exports = router;