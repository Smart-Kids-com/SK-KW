const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

/**
 * Helpers
 */
const MAX_PRODUCTS_LIST_LIMIT = 100;

function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  const allowed = ['active', 'draft', 'archived'];
  return allowed.includes(value) ? value : 'active';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function buildPlainProduct(product) {
  return {
    ...product,
    tags_list: parseTags(product.tags),
    images: [],
    primary_image: product.image_url || ''
  };
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
    status: body.status ?? body.published ?? 'draft',
    productType: body.productType ?? body.product_type ?? body.type ?? '',
    vendor: body.vendor ?? '',
    category: body.category ?? body.collection ?? '',
    tags: body.tags ?? '',
    seoTitle: body.seoTitle ?? body.seo_title ?? '',
    seoDescription: body.seoDescription ?? body.seo_description ?? '',
    images: body.images
  };
}

/**
 * Schema safety
 */
let productsSchemaReadyPromise = null;

async function getTableColumns(tableName) {
  const rows = await db.all(`PRAGMA table_info(${tableName})`);
  return Array.isArray(rows) ? rows.map(row => row.name) : [];
}

async function ensureProductsSchema() {
  if (productsSchemaReadyPromise) {
    return productsSchemaReadyPromise;
  }

  productsSchemaReadyPromise = (async () => {
    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        slug TEXT,
        sku TEXT,
        description TEXT,
        price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        image_url TEXT,
        stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        product_type TEXT,
        vendor TEXT,
        category TEXT,
        tags TEXT,
        seo_title TEXT,
        seo_description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const productColumns = await getTableColumns('products');
    const productColumnSet = new Set(productColumns);

    const missingProductColumns = [
      ['slug', 'TEXT'],
      ['sku', 'TEXT'],
      ['description', 'TEXT'],
      ['price', 'REAL DEFAULT 0'],
      ['sale_price', 'REAL DEFAULT 0'],
      ['image_url', 'TEXT'],
      ['stock', 'INTEGER DEFAULT 0'],
      ['status', `TEXT DEFAULT 'active'`],
      ['product_type', 'TEXT'],
      ['vendor', 'TEXT'],
      ['category', 'TEXT'],
      ['tags', 'TEXT'],
      ['seo_title', 'TEXT'],
      ['seo_description', 'TEXT'],
      ['created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP']
    ];

    for (const [columnName, columnSql] of missingProductColumns) {
      if (!productColumnSet.has(columnName)) {
        await db.run(`ALTER TABLE products ADD COLUMN ${columnName} ${columnSql}`);
      }
    }

    const productImageColumns = await getTableColumns('product_images');
    const productImageSet = new Set(productImageColumns);

    const missingImageColumns = [
      ['product_id', 'INTEGER NOT NULL DEFAULT 0'],
      ['image_url', 'TEXT'],
      ['sort_order', 'INTEGER DEFAULT 0'],
      ['created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP']
    ];

    for (const [columnName, columnSql] of missingImageColumns) {
      if (!productImageSet.has(columnName)) {
        await db.run(`ALTER TABLE product_images ADD COLUMN ${columnName} ${columnSql}`);
      }
    }

    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`);
  })().catch((error) => {
    productsSchemaReadyPromise = null;
    throw error;
  });

  return productsSchemaReadyPromise;
}

router.use(async (req, res, next) => {
  try {
    await ensureProductsSchema();
    next();
  } catch (error) {
    console.error('❌ Product schema init error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تهيئة جدول المنتجات'
    });
  }
});

/**
 * Product helpers after schema
 */
async function getProductImages(productId) {
  return await db.all(
    `SELECT id, product_id, image_url, sort_order, created_at
     FROM product_images
     WHERE product_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [productId]
  );
}

async function enrichProduct(product) {
  if (!product) return null;

  const images = await getProductImages(product.id);

  return {
    ...product,
    tags_list: parseTags(product.tags),
    images,
    primary_image: images.length ? images[0].image_url : (product.image_url || '')
  };
}

async function makeUniqueSlug(baseText = '', excludeId = null) {
  const base = slugify(baseText) || `product-${Date.now()}`;
  let candidate = base;
  let index = 2;

  while (true) {
    const existing = excludeId
      ? await db.get(`SELECT id FROM products WHERE slug = ? AND id != ?`, [candidate, excludeId])
      : await db.get(`SELECT id FROM products WHERE slug = ?`, [candidate]);

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

    if (!productName || normalizeText(productName) === '') {
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
        seo_description,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
      const finalSlug = await makeUniqueSlug(slug || product.product_name, id);
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
      updateFields.push('sale_price = ?');
      updateValues.push(toNumber(salePrice, 0));
    }

    if (stock !== undefined) {
      updateFields.push('stock = ?');
      updateValues.push(toInteger(stock, 0));
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(normalizeStatus(status));
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

    const rows = await db.all(`SELECT * FROM products`);
    let products = Array.isArray(rows) ? rows : [];

    if (status) {
      const normalizedStatus = String(status || '').trim().toLowerCase();
      products = products.filter(product =>
        String(product.status || '').trim().toLowerCase() === normalizedStatus
      );
    }

    if (search) {
      const q = String(search).trim().toLowerCase();
      products = products.filter(product => {
        const haystack = [
          product.product_name,
          product.sku,
          product.slug,
          product.description,
          product.product_type,
          product.vendor,
          product.category,
          product.tags
        ]
          .map(v => String(v || '').trim().toLowerCase())
          .join(' ');
        return haystack.includes(q);
      });
    }

    const sortKey = String(sort || 'created_at');
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    products.sort((a, b) => {
      let av;
      let bv;

      switch (sortKey) {
        case 'product_name':
          av = String(a.product_name || '').trim().toLowerCase();
          bv = String(b.product_name || '').trim().toLowerCase();
          break;
        case 'price':
          av = Number(a.price || 0);
          bv = Number(b.price || 0);
          break;
        case 'sale_price':
          av = Number(a.sale_price || 0);
          bv = Number(b.sale_price || 0);
          break;
        case 'stock':
          av = Number(a.stock || 0);
          bv = Number(b.stock || 0);
          break;
        case 'status':
          av = String(a.status || '').trim().toLowerCase();
          bv = String(b.status || '').trim().toLowerCase();
          break;
        case 'product_type':
          av = String(a.product_type || '').trim().toLowerCase();
          bv = String(b.product_type || '').trim().toLowerCase();
          break;
        case 'vendor':
          av = String(a.vendor || '').trim().toLowerCase();
          bv = String(b.vendor || '').trim().toLowerCase();
          break;
        case 'category':
          av = String(a.category || '').trim().toLowerCase();
          bv = String(b.category || '').trim().toLowerCase();
          break;
        case 'updated_at':
          av = new Date(a.updated_at || 0).getTime();
          bv = new Date(b.updated_at || 0).getTime();
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

    const parsedLimit = clamp(toInteger(limit, 50), 1, MAX_PRODUCTS_LIST_LIMIT);
    const parsedOffset = Math.max(0, toInteger(offset, 0));
    const total = products.length;

    const paginated = products
      .slice(parsedOffset, parsedOffset + parsedLimit)
      .map(product => buildPlainProduct(product));

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
    console.error('❌ خطأ في جلب المنتجات:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب المنتجات'
    });
  }
});

module.exports = router;