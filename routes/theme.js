const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

function normalizeText(value = '') {
  return String(value || '').trim();
}

function toInteger(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBooleanFlag(value, defaultValue = 1) {
  if (value === undefined || value === null || value === '') return defaultValue ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;

  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return 1;
  if (['0', 'false', 'no', 'off'].includes(text)) return 0;

  return defaultValue ? 1 : 0;
}

function parseSettingsJson(value) {
  try {
    return JSON.parse(String(value || '{}'));
  } catch {
    return {};
  }
}

function stringifySettings(settings) {
  try {
    return JSON.stringify(settings || {});
  } catch {
    return '{}';
  }
}

async function ensureThemeTables() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS theme_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS theme_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      settings_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES theme_pages(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS theme_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    INSERT OR IGNORE INTO theme_pages (page_key, title)
    VALUES ('home', 'Homepage')
  `);
}

async function getPageByKey(pageKey) {
  return await db.get(`SELECT * FROM theme_pages WHERE page_key = ?`, [pageKey]);
}

async function getSectionsForPage(pageId) {
  const rows = await db.all(
    `SELECT * FROM theme_sections
     WHERE page_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [pageId]
  );

  return rows.map(row => ({
    ...row,
    settings: parseSettingsJson(row.settings_json),
    is_visible: Number(row.is_visible || 0)
  }));
}

async function reindexSections(pageId) {
  const rows = await db.all(
    `SELECT id FROM theme_sections WHERE page_id = ? ORDER BY sort_order ASC, id ASC`,
    [pageId]
  );

  let i = 1;
  for (const row of rows) {
    await db.run(
      `UPDATE theme_sections
       SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [i, row.id]
    );
    i += 1;
  }
}

router.use(async (req, res, next) => {
  try {
    await ensureThemeTables();
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/theme/pages/:pageKey
 */
router.get('/pages/:pageKey', async (req, res) => {
  try {
    const pageKey = normalizeText(req.params.pageKey);
    const page = await getPageByKey(pageKey);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    const sections = await getSectionsForPage(page.id);

    return res.json({
      success: true,
      data: {
        ...page,
        sections
      }
    });
  } catch (error) {
    console.error('❌ Theme page load error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحميل صفحة الثيم'
    });
  }
});

/**
 * GET /api/theme/pages/:pageKey/sections
 */
router.get('/pages/:pageKey/sections', async (req, res) => {
  try {
    const pageKey = normalizeText(req.params.pageKey);
    const page = await getPageByKey(pageKey);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    const sections = await getSectionsForPage(page.id);

    return res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('❌ Theme sections load error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحميل الأقسام'
    });
  }
});

/**
 * POST /api/theme/pages/:pageKey/sections
 */
router.post('/pages/:pageKey/sections', async (req, res) => {
  try {
    const pageKey = normalizeText(req.params.pageKey);
    const page = await getPageByKey(pageKey);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    const type = normalizeText(req.body.type);
    const title = normalizeText(req.body.title) || type || 'Section';
    const settings = req.body.settings || {};
    const isVisible = normalizeBooleanFlag(req.body.is_visible, 1);

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'نوع القسم مطلوب'
      });
    }

    const lastRow = await db.get(
      `SELECT MAX(sort_order) as maxOrder FROM theme_sections WHERE page_id = ?`,
      [page.id]
    );

    const nextOrder = Number(lastRow?.maxOrder || 0) + 1;

    await db.run(
      `INSERT INTO theme_sections
      (page_id, type, title, settings_json, sort_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        page.id,
        type,
        title,
        stringifySettings(settings),
        nextOrder,
        isVisible
      ]
    );

    const created = await db.get(
      `SELECT * FROM theme_sections WHERE page_id = ? ORDER BY id DESC LIMIT 1`,
      [page.id]
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
      data: {
        ...created,
        settings: parseSettingsJson(created.settings_json),
        is_visible: Number(created.is_visible || 0)
      }
    });
  } catch (error) {
    console.error('❌ Theme section create error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إنشاء القسم'
    });
  }
});

/**
 * PUT /api/theme/sections/:id
 */
router.put('/sections/:id', async (req, res) => {
  try {
    const sectionId = req.params.id;
    const section = await db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]);

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    const updateFields = [];
    const values = [];

    if (req.body.type !== undefined) {
      updateFields.push('type = ?');
      values.push(normalizeText(req.body.type));
    }

    if (req.body.title !== undefined) {
      updateFields.push('title = ?');
      values.push(normalizeText(req.body.title) || 'Section');
    }

    if (req.body.settings !== undefined) {
      updateFields.push('settings_json = ?');
      values.push(stringifySettings(req.body.settings));
    }

    if (req.body.sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      values.push(Math.max(1, toInteger(req.body.sort_order, 1)));
    }

    if (req.body.is_visible !== undefined) {
      updateFields.push('is_visible = ?');
      values.push(normalizeBooleanFlag(req.body.is_visible, 1));
    }

    if (!updateFields.length) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد بيانات للتحديث'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sectionId);

    await db.run(
      `UPDATE theme_sections
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      values
    );

    const updated = await db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]);

    await reindexSections(updated.page_id);

    const refreshed = await db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]);

    return res.json({
      success: true,
      message: 'تم تحديث القسم بنجاح',
      data: {
        ...refreshed,
        settings: parseSettingsJson(refreshed.settings_json),
        is_visible: Number(refreshed.is_visible || 0)
      }
    });
  } catch (error) {
    console.error('❌ Theme section update error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث القسم'
    });
  }
});

/**
 * DELETE /api/theme/sections/:id
 */
router.delete('/sections/:id', async (req, res) => {
  try {
    const sectionId = req.params.id;
    const section = await db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]);

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    await db.run(`DELETE FROM theme_sections WHERE id = ?`, [sectionId]);
    await reindexSections(section.page_id);

    return res.json({
      success: true,
      message: 'تم حذف القسم بنجاح'
    });
  } catch (error) {
    console.error('❌ Theme section delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف القسم'
    });
  }
});

/**
 * POST /api/theme/sections/:id/duplicate
 */
router.post('/sections/:id/duplicate', async (req, res) => {
  try {
    const sectionId = req.params.id;
    const section = await db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]);

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    const lastRow = await db.get(
      `SELECT MAX(sort_order) as maxOrder FROM theme_sections WHERE page_id = ?`,
      [section.page_id]
    );

    const nextOrder = Number(lastRow?.maxOrder || 0) + 1;

    await db.run(
      `INSERT INTO theme_sections
      (page_id, type, title, settings_json, sort_order, is_visible)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        section.page_id,
        section.type,
        `${section.title} - Copy`,
        section.settings_json || '{}',
        nextOrder,
        Number(section.is_visible || 0)
      ]
    );

    const created = await db.get(
      `SELECT * FROM theme_sections WHERE page_id = ? ORDER BY id DESC LIMIT 1`,
      [section.page_id]
    );

    return res.status(201).json({
      success: true,
      message: 'تم نسخ القسم بنجاح',
      data: {
        ...created,
        settings: parseSettingsJson(created.settings_json),
        is_visible: Number(created.is_visible || 0)
      }
    });
  } catch (error) {
    console.error('❌ Theme section duplicate error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في نسخ القسم'
    });
  }
});

/**
 * POST /api/theme/pages/:pageKey/reorder
 * body: { sectionIds: [3,1,2] }
 */
router.post('/pages/:pageKey/reorder', async (req, res) => {
  try {
    const pageKey = normalizeText(req.params.pageKey);
    const page = await getPageByKey(pageKey);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    const sectionIds = Array.isArray(req.body.sectionIds) ? req.body.sectionIds : [];

    if (!sectionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'ترتيب الأقسام غير موجود'
      });
    }

    let order = 1;
    for (const sectionId of sectionIds) {
      await db.run(
        `UPDATE theme_sections
         SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND page_id = ?`,
        [order, sectionId, page.id]
      );
      order += 1;
    }

    await reindexSections(page.id);
    const sections = await getSectionsForPage(page.id);

    return res.json({
      success: true,
      message: 'تم إعادة ترتيب الأقسام',
      data: sections
    });
  } catch (error) {
    console.error('❌ Theme reorder error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في إعادة ترتيب الأقسام'
    });
  }
});

/**
 * GET /api/theme/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const rows = await db.all(`SELECT * FROM theme_settings ORDER BY id ASC`);
    const settings = {};

    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Theme settings load error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحميل إعدادات الثيم'
    });
  }
});

/**
 * PUT /api/theme/settings
 * body: { settings: { key: value } }
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body.settings || {};

    for (const [key, value] of Object.entries(settings)) {
      const settingKey = normalizeText(key);
      if (!settingKey) continue;

      await db.run(
        `INSERT INTO theme_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON CONFLICT(setting_key)
         DO UPDATE SET
           setting_value = excluded.setting_value,
           updated_at = CURRENT_TIMESTAMP`,
        [settingKey, String(value ?? '')]
      );
    }

    const rows = await db.all(`SELECT * FROM theme_settings ORDER BY id ASC`);
    const output = {};
    for (const row of rows) {
      output[row.setting_key] = row.setting_value;
    }

    return res.json({
      success: true,
      message: 'تم حفظ إعدادات الثيم',
      data: output
    });
  } catch (error) {
    console.error('❌ Theme settings save error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حفظ إعدادات الثيم'
    });
  }
});

module.exports = router;