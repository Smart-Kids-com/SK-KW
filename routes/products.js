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

function normalizeStatus(status) {
  const raw = String(status ?? '').trim().toLowerCase();

  if (['active', 'published', 'true', '1', 'yes'].includes(raw)) return 'active';
  if (['draft', 'false', '0', 'no', 'unpublished', 'inactive'].includes(raw)) return 'draft';
  if (['archived'].includes(raw)) return 'archived';

  return 'active';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value = '') {
  return String(value || '').trim();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => normalizeText(tag))
      .filter(Boolean)
      .join(',');
  }

  return normalizeText(tags);
}

function parseTags(tags) {
  return String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function normalizeImages(images, fallbackImageUrl = '') {
  let result = [];

  if (Array.isArray(images)) {
    result = images
      .map((image, index) => {
        if (typeof image === 'string') {
          const url = normalizeText(image);
          return url ? { image_url: url, sort_order: index } : null;
        }

        if (image && typeof image === 'object') {
          const url = normalizeText(image.image_url || image.url || image.imageUrl || '');
          if (!url) return null;

          return {
            image_url: url,
            sort_order: Number.isFinite(Number(image.sort_order))
              ? Number(image.sort_order)
              : index
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (!result.length && fallbackImageUrl) {
    result = [{
      image_url: normalizeText(fallbackImageUrl),
      sort_order: 0
    }];
  }

  return result;
}

/**
 * Guardrails (prevent Vercel timeouts + huge payloads)
 */
const MAX_LIMIT = 30;
const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LEN = 80;
const DB_OP_TIMEOUT_MS = 12_000;

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Images
 */
async function getProductImages(productId) {
  return await withTimeout(
    db.all(
      `SELECT id, product_id, image_url, sort_order, created_at
       FROM product_images
       WHERE product_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [productId]
    ),
    DB_OP_TIMEOUT_MS,
    'getProductImages'
  );
}

async function getImagesMapForProductIds(productIds = []) {
  const validIds = productIds
    .map(id => Number(id))
    .filter(id => Number.isFinite(id));

  if (!validIds.length) {
    return new Map();
  }

  const placeholders = validIds.map(() => '?').join(',');
  const rows = await withTimeout(
    db.all(
      `SELECT id, product_id, image_url, sort_order, created_at
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY product_id ASC, sort_order ASC, id ASC`,
      validIds
    ),
    DB_OP_TIMEOUT_MS,
    'getImagesMapForProductIds'
  );

  const map = new Map();
  for (const row of rows) {
    const key = Number(row.product_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }

  return map;
}

function enrichProductWithImages(product, images = []) {
  if (!product) return null;

  return {
    ...product,
    tags_list: parseTags(product.tags),
    images,
    primary_image: images.length ? images[0].image_url : (product.image_url || '')
  };
}

async function enrichProduct(product) {
  if (!product) return null;
  const images = await getProductImages(product.id);
  return enrichProductWithImages(product, images);
}

async function enrichProducts(products = []) {
  if (!Array.isArray(products) || !products.length) return [];

  const ids = products
    .map(product => Number(product.id))
    .filter(id => Number.isFinite(id));

  const imagesMap = await getImagesMapForProductIds(ids);

  return products.map(product => {
    const images = imagesMap.get(Number(product.id)) || [];
    return enrichProductWithImages(product, images);
  });
}

function normalizeIncomingProductBody(body = {}) {
  return {
    productName: body.productName ?? body.product_name ?? body.name ?? body.title ?? '',
    slug: body.slug ?? body.handle ?? '',
    sku: body.sku ?? body.sku_code ?? '',
    description: body.description ?? body.body_html ?? '',
    price: body.price ?? body.regular_price ?? 0,
    salePrice: body.salePrice ?? body.sale_price ?? body.compare_at_price ?? 0,
    imageUrl: body.imageUrl ?? body.image_url ?? body.image ?? '',
    stock: body.stock ?? body.inventory ?? body.inventory_quantity ?? 0,
    status: body.status ?? body.published ?? 'active',
    productType: body.productType ?? body.product_type ?? body.type ?? '',
    vendor: body.vendor ?? '',
    category: body.category ?? body.collection ?? '',
    tags: body.tags ?? '',
    seoTitle: body.seoTitle ?? body.seo_title ?? '',
    seoDescription: body.seoDescription ?? body.seo_description ?? '',
    images: body.images
  };
}

async function makeUniqueSlug(baseText = '', excludeId = null) {
  const base = slugify(baseText) || `product-${Date.now()}`;
  let candidate = base;
  let index = 2;

  while (true) {
    const existing = excludeId
      ? await withTimeout(
          db.get(`SELECT id FROM products WHERE slug = ? AND id != ?`, [candidate, excludeId]),
          DB_OP_TIMEOUT_MS,
          'makeUniqueSlug(exclude)'
        )
      : await withTimeout(
          db.get(`SELECT id FROM products WHERE slug = ?`, [candidate]),
          DB_OP_TIMEOUT_MS,
          'makeUniqueSlug'
        );

    if (!existing) return candidate;

    candidate = `${base}-${index}`;
    index += 1;
  }
}

/**
 * GET /api/products/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      draftProducts,
      archivedProducts,
      totalStock
    ] = await Promise.all([
      withTimeout(db.get(`SELECT COUNT(*) as count FROM products`), DB_OP_TIMEOUT_MS, 'count(total)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'active'`), DB_OP_TIMEOUT_MS, 'count(active)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'draft'`), DB_OP_TIMEOUT_MS, 'count(draft)'),
      withTimeout(db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'archived'`), DB_OP_TIMEOUT_MS, 'count(archived)'),
      withTimeout(db.get(`SELECT SUM(stock) as total FROM products`), DB_OP_TIMEOUT_MS, 'sum(stock)')
    ]);

    return res.json({
      success: true,
      data: {
        totalProducts: Number(totalProducts?.count || 0),
        activeProducts: Number(activeProducts?.count || 0),
        draftProducts: Number(draftProducts?.count || 0),
        archivedProducts: Number(archivedProducts?.count || 0),
        totalStock: Number(totalStock?.total || 0)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المنتجات:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب إحصائيات المنتجات' });
  }
});

/**
 * GET /api/products/slug/:slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await withTimeout(
      db.get(
        `SELECT
          id, product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description,
          created_at, updated_at
         FROM products
         WHERE slug = ?`,
        [slug]
      ),
      DB_OP_TIMEOUT_MS,
      'getProductBySlug'
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }

    const enrichedProduct = await enrichProduct(product);
    return res.json({ success: true, data: enrichedProduct });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتج بالـ slug:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب المنتج' });
  }
});

/**
 * POST /api/products
 */
router.post('/', async (req, res) => {
  try {
    const {
      productName,
      slug,
      sku,
      description,
      price,
      salePrice,
      imageUrl,
      stock,
      status,
      productType,
      vendor,
      category,
      tags,
      seoTitle,
      seoDescription,
      images
    } = normalizeIncomingProductBody(req.body);

    if (!normalizeText(productName)) {
      return res.status(400).json({ success: false, error: 'اسم المنتج مطلوب' });
    }

    const finalPrice = toNumber(price, NaN);
    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      return res.status(400).json({ success: false, error: 'السعر غير صحيح' });
    }

    const finalSalePrice = toNumber(salePrice, 0);
    const finalStock = toInteger(stock, 0);
    const finalSlug = await makeUniqueSlug(slug || productName);
    const finalSku = normalizeText(sku) || null;
    const finalStatus = normalizeStatus(status);
    const finalImages = normalizeImages(images, imageUrl);
    const primaryImage = finalImages.length ? finalImages[0].image_url : normalizeText(imageUrl);

    const existingSlug = await withTimeout(
      db.get(`SELECT id FROM products WHERE slug = ?`, [finalSlug]),
      DB_OP_TIMEOUT_MS,
      'checkSlugUnique'
    );
    if (existingSlug) {
      return res.status(409).json({ success: false, error: 'الـ slug مستخدم بالفعل' });
    }

    if (finalSku) {
      const existingSku = await withTimeout(
        db.get(`SELECT id FROM products WHERE sku = ?`, [finalSku]),
        DB_OP_TIMEOUT_MS,
        'checkSkuUnique'
      );
      if (existingSku) {
        return res.status(409).json({ success: false, error: 'SKU مستخدم بالفعل' });
      }
    }

    await withTimeout(
      db.run(
        `INSERT INTO products
        (
          product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizeText(productName),
          finalSlug,
          finalSku,
          description || '',
          finalPrice,
          finalSalePrice,
          primaryImage || '',
          finalStock,
          finalStatus,
          normalizeText(productType),
          normalizeText(vendor),
          normalizeText(category),
          normalizeTags(tags),
          normalizeText(seoTitle),
          normalizeText(seoDescription)
        ]
      ),
      DB_OP_TIMEOUT_MS,
      'insertProduct'
    );

    const savedProduct = await withTimeout(
      db.get(
        `SELECT
          id, product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description,
          created_at, updated_at
         FROM products
         WHERE slug = ?
         ORDER BY id DESC
         LIMIT 1`,
        [finalSlug]
      ),
      DB_OP_TIMEOUT_MS,
      'selectSavedProduct'
    );

    if (savedProduct && finalImages.length) {
      for (const image of finalImages) {
        await withTimeout(
          db.run(
            `INSERT INTO product_images (product_id, image_url, sort_order)
             VALUES (?, ?, ?)`,
            [savedProduct.id, image.image_url, image.sort_order]
          ),
          DB_OP_TIMEOUT_MS,
          'insertProductImage'
        );
      }
    }

    const enrichedProduct = await enrichProduct(savedProduct);

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المنتج بنجاح',
      data: enrichedProduct
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء المنتج:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء المنتج' });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      slug,
      sku,
      description,
      price,
      salePrice,
      imageUrl,
      stock,
      status,
      productType,
      vendor,
      category,
      tags,
      seoTitle,
      seoDescription,
      images
    } = normalizeIncomingProductBody(req.body);

    const product = await withTimeout(
      db.get(
        `SELECT
          id, product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description,
          created_at, updated_at
         FROM products
         WHERE id = ?`,
        [id]
      ),
      DB_OP_TIMEOUT_MS,
      'getProductForUpdate'
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }

    const updateFields = [];
    const updateValues = [];

    if (productName !== undefined) {
      const finalName = normalizeText(productName);
      if (!finalName) {
        return res.status(400).json({ success: false, error: 'اسم المنتج غير صحيح' });
      }
      updateFields.push('product_name = ?');
      updateValues.push(finalName);
    }

    if (slug !== undefined) {
      const finalSlug = await makeUniqueSlug(slug, id);

      const existingSlug = await withTimeout(
        db.get(`SELECT id FROM products WHERE slug = ? AND id != ?`, [finalSlug, id]),
        DB_OP_TIMEOUT_MS,
        'checkSlugUniqueOnUpdate'
      );
      if (existingSlug) {
        return res.status(409).json({ success: false, error: 'الـ slug مستخدم بالفعل' });
      }

      updateFields.push('slug = ?');
      updateValues.push(finalSlug);
    }

    if (sku !== undefined) {
      const finalSku = normalizeText(sku) || null;

      if (finalSku) {
        const existingSku = await withTimeout(
          db.get(`SELECT id FROM products WHERE sku = ? AND id != ?`, [finalSku, id]),
          DB_OP_TIMEOUT_MS,
          'checkSkuUniqueOnUpdate'
        );
        if (existingSku) {
          return res.status(409).json({ success: false, error: 'SKU مستخدم بالفعل' });
        }
      }

      updateFields.push('sku = ?');
      updateValues.push(finalSku);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || '');
    }

    if (price !== undefined) {
      const finalPrice = toNumber(price, NaN);
      if (!Number.isFinite(finalPrice) || finalPrice < 0) {
        return res.status(400).json({ success: false, error: 'السعر غير صحيح' });
      }
      updateFields.push('price = ?');
      updateValues.push(finalPrice);
    }

    if (salePrice !== undefined) {
      const finalSalePrice = toNumber(salePrice, 0);
      updateFields.push('sale_price = ?');
      updateValues.push(finalSalePrice);
    }

    if (stock !== undefined) {
      const finalStock = toInteger(stock, 0);
      updateFields.push('stock = ?');
      updateValues.push(finalStock);
    }

    if (status !== undefined) {
      const finalStatus = normalizeStatus(status);
      updateFields.push('status = ?');
      updateValues.push(finalStatus);
    }

    if (productType !== undefined) {
      updateFields.push('product_type = ?');
      updateValues.push(normalizeText(productType));
    }

    if (vendor !== undefined) {
      updateFields.push('vendor = ?');
      updateValues.push(normalizeText(vendor));
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(normalizeText(category));
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(normalizeTags(tags));
    }

    if (seoTitle !== undefined) {
      updateFields.push('seo_title = ?');
      updateValues.push(normalizeText(seoTitle));
    }

    if (seoDescription !== undefined) {
      updateFields.push('seo_description = ?');
      updateValues.push(normalizeText(seoDescription));
    }

    const finalImages = images !== undefined
      ? normalizeImages(images, imageUrl)
      : (imageUrl !== undefined ? normalizeImages([], imageUrl) : null);

    if (imageUrl !== undefined || images !== undefined) {
      const primaryImage = finalImages && finalImages.length
        ? finalImages[0].image_url
        : normalizeText(imageUrl);

      updateFields.push('image_url = ?');
      updateValues.push(primaryImage || '');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) {
      return res.status(400).json({ success: false, error: 'لا توجد بيانات للتحديث' });
    }

    updateValues.push(id);

    await withTimeout(
      db.run(
        `UPDATE products
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateValues
      ),
      DB_OP_TIMEOUT_MS,
      'updateProduct'
    );

    if (finalImages !== null) {
      await withTimeout(db.run(`DELETE FROM product_images WHERE product_id = ?`, [id]), DB_OP_TIMEOUT_MS, 'deleteProductImages');

      for (const image of finalImages) {
        await withTimeout(
          db.run(
            `INSERT INTO product_images (product_id, image_url, sort_order)
             VALUES (?, ?, ?)`,
            [id, image.image_url, image.sort_order]
          ),
          DB_OP_TIMEOUT_MS,
          'insertProductImageOnUpdate'
        );
      }
    }

    const updatedProduct = await withTimeout(
      db.get(
        `SELECT
          id, product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description,
          created_at, updated_at
         FROM products
         WHERE id = ?`,
        [id]
      ),
      DB_OP_TIMEOUT_MS,
      'getUpdatedProduct'
    );

    const enrichedProduct = await enrichProduct(updatedProduct);

    return res.json({ success: true, message: 'تم تحديث المنتج بنجاح', data: enrichedProduct });
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
    return res.status(500).json({ success: false, error: 'فشل في تحديث المنتج' });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await withTimeout(
      db.get(`SELECT id, product_name FROM products WHERE id = ?`, [id]),
      DB_OP_TIMEOUT_MS,
      'getProductForDelete'
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }

    await withTimeout(db.run(`DELETE FROM product_images WHERE product_id = ?`, [id]), DB_OP_TIMEOUT_MS, 'deleteImages');
    await withTimeout(db.run(`DELETE FROM products WHERE id = ?`, [id]), DB_OP_TIMEOUT_MS, 'deleteProduct');

    return res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح',
      data: {
        deletedProductId: product.id,
        deletedProductName: product.product_name
      }
    });
  } catch (error) {
    console.error('❌ خطأ في حذف المنتج:', error);
    return res.status(500).json({ success: false, error: 'فشل في حذف المنتج' });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await withTimeout(
      db.get(
        `SELECT
          id, product_name, slug, sku, description,
          price, sale_price, image_url, stock, status,
          product_type, vendor, category, tags,
          seo_title, seo_description,
          created_at, updated_at
         FROM products
         WHERE id = ?`,
        [id]
      ),
      DB_OP_TIMEOUT_MS,
      'getProductById'
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    }

    const enrichedProduct = await enrichProduct(product);
    return res.json({ success: true, data: enrichedProduct });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتج:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب المنتج' });
  }
});

/**
 * GET /api/products
 *
 * Fixes:
 * - avoid SELECT *
 * - cap limit
 * - guard search length
 * - optional cursor pagination (created_at/id)
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      search,
      limit = DEFAULT_LIMIT,
      offset = 0,
      sort = 'created_at',
      order = 'DESC',
      cursorCreatedAt,
      cursorId
    } = req.query;

    const validSortColumns = [
      'created_at',
      'updated_at',
      'product_name',
      'price',
      'sale_price',
      'stock',
      'status',
      'product_type',
      'vendor',
      'category'
    ];

    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, toInteger(limit, DEFAULT_LIMIT)));
    const parsedOffset = Math.max(0, toInteger(offset, 0));

    const where = [];
    const params = [];

    if (status) {
      where.push(`status = ?`);
      params.push(status);
    }

    let searchValue = null;
    if (search) {
      const s = String(search).trim();
      if (s.length > 0) {
        const clipped = s.slice(0, MAX_SEARCH_LEN);
        searchValue = `%${clipped}%`;
        where.push(`(
          product_name LIKE ?
          OR sku LIKE ?
          OR slug LIKE ?
          OR description LIKE ?
          OR product_type LIKE ?
          OR vendor LIKE ?
          OR category LIKE ?
          OR tags LIKE ?
        )`);
        params.push(
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue
        );
      }
    }

    const useCursor =
      cursorCreatedAt &&
      sortColumn === 'created_at' &&
      (sortOrder === 'DESC' || sortOrder === 'ASC');

    if (useCursor) {
      const cid = Number(cursorId);
      const hasValidId = Number.isFinite(cid) && cid > 0;

      if (sortOrder === 'DESC') {
        if (hasValidId) {
          where.push(`(created_at < ? OR (created_at = ? AND id < ?))`);
          params.push(cursorCreatedAt, cursorCreatedAt, cid);
        } else {
          where.push(`created_at < ?`);
          params.push(cursorCreatedAt);
        }
      } else {
        if (hasValidId) {
          where.push(`(created_at > ? OR (created_at = ? AND id > ?))`);
          params.push(cursorCreatedAt, cursorCreatedAt, cid);
        } else {
          where.push(`created_at > ?`);
          params.push(cursorCreatedAt);
        }
      }
    }

    let sql =
      `SELECT
        id, product_name, slug, sku,
        price, sale_price, image_url, stock, status,
        product_type, vendor, category, tags,
        created_at, updated_at
       FROM products`;

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    sql += ` ORDER BY ${sortColumn} ${sortOrder}, id ${sortOrder}`;

    if (!useCursor) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parsedLimit, parsedOffset);
    } else {
      sql += ` LIMIT ?`;
      params.push(parsedLimit);
    }

    const products = await withTimeout(db.all(sql, params), DB_OP_TIMEOUT_MS, 'listProducts');
    const enriched = await enrichProducts(products);

    // totalPages/total اختياريين — هنحسبهم فقط لما مش بنستخدم cursor
    let total = null;
    if (!useCursor) {
      try {
        let countSql = `SELECT COUNT(*) as total FROM products`;
        const countParams = [];

        if (where.length > 0) {
          countSql += ` WHERE ${where.join(' AND ')}`;

          if (status) countParams.push(status);

          if (searchValue) {
            countParams.push(
              searchValue, searchValue, searchValue, searchValue,
              searchValue, searchValue, searchValue, searchValue
            );
          }
        }

        const countResult = await withTimeout(db.get(countSql, countParams), DB_OP_TIMEOUT_MS, 'countProducts');
        total = Number(countResult?.total || 0);
      } catch (e) {
        total = null;
      }
    }

    return res.json({
      success: true,
      data: enriched,
      pagination: {
        limit: parsedLimit,
        offset: useCursor ? null : parsedOffset,
        total,
        totalPages: total != null ? Math.ceil(total / parsedLimit) : null,
        cursor: enriched.length
          ? { created_at: enriched[enriched.length - 1].created_at, id: enriched[enriched.length - 1].id }
          : null
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);

    if (String(error?.message || '').includes('timed out')) {
      return res.status(503).json({
        success: false,
        error: 'الاستعلام استغرق وقتًا طويلاً. حاول تقليل limit أو تعطيل search أو استخدام cursor.'
      });
    }

    return res.status(500).json({ success: false, error: 'فشل في جلب المنتجات' });
  }
});

module.exports = router;