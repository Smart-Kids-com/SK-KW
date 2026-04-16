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

async function getProductImages(productId) {
  return await db.all(
    `SELECT id, product_id, image_url, sort_order, created_at
     FROM product_images
     WHERE product_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [productId]
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
  const rows = await db.all(
    `SELECT id, product_id, image_url, sort_order, created_at
     FROM product_images
     WHERE product_id IN (${placeholders})
     ORDER BY product_id ASC, sort_order ASC, id ASC`,
    validIds
  );

  const map = new Map();

  for (const row of rows) {
    const key = Number(row.product_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
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
      ? await db.get(
          `SELECT id FROM products WHERE slug = ? AND id != ?`,
          [candidate, excludeId]
        )
      : await db.get(
          `SELECT id FROM products WHERE slug = ?`,
          [candidate]
        );

    if (!existing) return candidate;

    candidate = `${base}-${index}`;
    index += 1;
  }
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

/**
 * GET /api/products/stats/summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalProducts = await db.get(`SELECT COUNT(*) as count FROM products`);
    const activeProducts = await db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'active'`);
    const draftProducts = await db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'draft'`);
    const archivedProducts = await db.get(`SELECT COUNT(*) as count FROM products WHERE status = 'archived'`);
    const totalStock = await db.get(`SELECT SUM(stock) as total FROM products`);

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
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المنتجات'
    });
  }
});

/**
 * GET /api/products/slug/:slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await db.get(
      `SELECT * FROM products WHERE slug = ?`,
      [slug]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const enrichedProduct = await enrichProduct(product);

    return res.json({
      success: true,
      data: enrichedProduct
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتج بالـ slug:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المنتج'
    });
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
      return res.status(400).json({
        success: false,
        error: 'اسم المنتج مطلوب'
      });
    }

    const finalPrice = toNumber(price, NaN);
    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'السعر غير صحيح'
      });
    }

    const finalSalePrice = toNumber(salePrice, 0);
    const finalStock = toInteger(stock, 0);
    const finalSlug = await makeUniqueSlug(slug || productName);
    const finalSku = normalizeText(sku) || null;
    const finalStatus = normalizeStatus(status);
    const finalImages = normalizeImages(images, imageUrl);
    const primaryImage = finalImages.length ? finalImages[0].image_url : normalizeText(imageUrl);

    const existingSlug = await db.get(
      `SELECT id FROM products WHERE slug = ?`,
      [finalSlug]
    );

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        error: 'الـ slug مستخدم بالفعل'
      });
    }

    if (finalSku) {
      const existingSku = await db.get(
        `SELECT id FROM products WHERE sku = ?`,
        [finalSku]
      );

      if (existingSku) {
        return res.status(409).json({
          success: false,
          error: 'SKU مستخدم بالفعل'
        });
      }
    }

    await db.run(
      `INSERT INTO products
      (
        product_name,
        slug,
        sku,
        description,
        price,
        sale_price,
        image_url,
        stock,
        status,
        product_type,
        vendor,
        category,
        tags,
        seo_title,
        seo_description
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
    );

    const savedProduct = await db.get(
      `SELECT * FROM products WHERE slug = ? ORDER BY id DESC LIMIT 1`,
      [finalSlug]
    );

    if (savedProduct && finalImages.length) {
      for (const image of finalImages) {
        await db.run(
          `INSERT INTO product_images (product_id, image_url, sort_order)
           VALUES (?, ?, ?)`,
          [savedProduct.id, image.image_url, image.sort_order]
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
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء المنتج'
    });
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

    const product = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (productName !== undefined) {
      const finalName = normalizeText(productName);
      if (!finalName) {
        return res.status(400).json({
          success: false,
          error: 'اسم المنتج غير صحيح'
        });
      }
      updateFields.push('product_name = ?');
      updateValues.push(finalName);
    }

    if (slug !== undefined) {
      const finalSlug = await makeUniqueSlug(slug, id);

      const existingSlug = await db.get(
        `SELECT id FROM products WHERE slug = ? AND id != ?`,
        [finalSlug, id]
      );

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          error: 'الـ slug مستخدم بالفعل'
        });
      }

      updateFields.push('slug = ?');
      updateValues.push(finalSlug);
    }

    if (sku !== undefined) {
      const finalSku = normalizeText(sku) || null;

      if (finalSku) {
        const existingSku = await db.get(
          `SELECT id FROM products WHERE sku = ? AND id != ?`,
          [finalSku, id]
        );

        if (existingSku) {
          return res.status(409).json({
            success: false,
            error: 'SKU مستخدم بالفعل'
          });
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
        return res.status(400).json({
          success: false,
          error: 'السعر غير صحيح'
        });
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
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateValues.push(id);

    await db.run(
      `UPDATE products
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    if (finalImages !== null) {
      await db.run(`DELETE FROM product_images WHERE product_id = ?`, [id]);

      for (const image of finalImages) {
        await db.run(
          `INSERT INTO product_images (product_id, image_url, sort_order)
           VALUES (?, ?, ?)`,
          [id, image.image_url, image.sort_order]
        );
      }
    }

    const updatedProduct = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );

    const enrichedProduct = await enrichProduct(updatedProduct);

    return res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: enrichedProduct
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث المنتج'
    });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    await db.run(`DELETE FROM product_images WHERE product_id = ?`, [id]);
    await db.run(`DELETE FROM products WHERE id = ?`, [id]);

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
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف المنتج'
    });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    const enrichedProduct = await enrichProduct(product);

    return res.json({
      success: true,
      data: enrichedProduct
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتج:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المنتج'
    });
  }
});

/**
 * GET /api/products
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

    let sql = `SELECT * FROM products`;
    const params = [];
    const where = [];

    if (status) {
      where.push(`status = ?`);
      params.push(status);
    }

    if (search) {
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
      const searchValue = `%${String(search).trim()}%`;
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

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

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
    const parsedLimit = Math.max(1, toInteger(limit, 50));
    const parsedOffset = Math.max(0, toInteger(offset, 0));

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    const products = await db.all(sql, params);
    const enrichedProducts = await enrichProducts(products);

    let countSql = `SELECT COUNT(*) as total FROM products`;
    const countParams = [];

    if (where.length > 0) {
      countSql += ` WHERE ${where.join(' AND ')}`;

      if (status) {
        countParams.push(status);
      }

      if (search) {
        const searchValue = `%${String(search).trim()}%`;
        countParams.push(
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

    const countResult = await db.get(countSql, countParams);
    const total = Number(countResult?.total || 0);

    return res.json({
      success: true,
      data: enrichedProducts,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المنتجات'
    });
  }
});

module.exports = router;