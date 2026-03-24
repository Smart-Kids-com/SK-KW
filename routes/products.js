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
  const allowed = ['active', 'draft', 'archived'];
  return allowed.includes(status) ? status : 'active';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
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

    return res.json({
      success: true,
      data: product
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
      status
    } = req.body;

    if (!productName || String(productName).trim() === '') {
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
    const finalSlug = slugify(slug || productName);
    const finalSku = sku ? String(sku).trim() : null;
    const finalStatus = normalizeStatus(status);

    // تحقق من slug
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

    // تحقق من sku
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
      (product_name, slug, sku, description, price, sale_price, image_url, stock, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(productName).trim(),
        finalSlug,
        finalSku,
        description || '',
        finalPrice,
        finalSalePrice,
        imageUrl || '',
        finalStock,
        finalStatus
      ]
    );

    const savedProduct = await db.get(
      `SELECT * FROM products WHERE slug = ? ORDER BY id DESC LIMIT 1`,
      [finalSlug]
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المنتج بنجاح',
      data: savedProduct
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
      status
    } = req.body;

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
      const finalName = String(productName).trim();
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
      const finalSlug = slugify(slug);
      if (!finalSlug) {
        return res.status(400).json({
          success: false,
          error: 'الـ slug غير صحيح'
        });
      }

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
      const finalSku = String(sku || '').trim() || null;

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

    if (imageUrl !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(imageUrl || '');
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

    const updatedProduct = await db.get(
      `SELECT * FROM products WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: updatedProduct
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

    await db.run(
      `DELETE FROM products WHERE id = ?`,
      [id]
    );

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

    return res.json({
      success: true,
      data: product
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
      )`);
      const searchValue = `%${String(search).trim()}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
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
      'status'
    ];

    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    sql += ` LIMIT ? OFFSET ?`;

    params.push(toInteger(limit, 50), toInteger(offset, 0));

    const products = await db.all(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM products`;
    const countParams = [];

    if (where.length > 0) {
      countSql += ` WHERE ${where.join(' AND ')}`;
      if (status) countParams.push(status);
      if (search) {
        const searchValue = `%${String(search).trim()}%`;
        countParams.push(searchValue, searchValue, searchValue, searchValue);
      }
    }

    const countResult = await db.get(countSql, countParams);
    const total = Number(countResult?.total || 0);
    const parsedLimit = toInteger(limit, 50);
    const parsedOffset = toInteger(offset, 0);

    return res.json({
      success: true,
      data: products,
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