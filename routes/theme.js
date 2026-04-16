const express = require('express');
const router = express.Router();
const db = require('../db/turso-manager');

/**
 * Guardrails
 */
const DB_OP_TIMEOUT_MS = 25_000;
const MAX_SETTINGS_KEYS = 50;
const ALLOWED_SECTION_TYPES = [
  'hero_slider',
  'featured_collection',
  'featured_products',
  'banner',
  'rich_text'
];

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
  await withTimeout(
    db.run(`
      CREATE TABLE IF NOT EXISTS theme_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    DB_OP_TIMEOUT_MS,
    'createThemePagesTable'
  );

  await withTimeout(
    db.run(`
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
    `),
    DB_OP_TIMEOUT_MS,
    'createThemeSectionsTable'
  );

  await withTimeout(
    db.run(`
      CREATE TABLE IF NOT EXISTS theme_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    DB_OP_TIMEOUT_MS,
    'createThemeSettingsTable'
  );

  await withTimeout(
    db.run(`
      INSERT OR IGNORE INTO theme_pages (page_key, title)
      VALUES ('home', 'Homepage')
    `),
    DB_OP_TIMEOUT_MS,
    'seedHomePage'
  );
}

async function getPageByKey(pageKey) {
  return await withTimeout(
    db.get(`SELECT * FROM theme_pages WHERE page_key = ?`, [pageKey]),
    DB_OP_TIMEOUT_MS,
    'getPageByKey'
  );
}

async function getSectionsForPage(pageId) {
  const rows = await withTimeout(
    db.all(
      `SELECT * FROM theme_sections
       WHERE page_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [pageId]
    ),
    DB_OP_TIMEOUT_MS,
    'getSectionsForPage'
  );

  return rows.map(row => ({
    ...row,
    settings: parseSettingsJson(row.settings_json),
    is_visible: Number(row.is_visible || 0)
  }));
}

async function reindexSections(pageId) {
  const rows = await withTimeout(
    db.all(
      `SELECT id FROM theme_sections WHERE page_id = ? ORDER BY sort_order ASC, id ASC`,
      [pageId]
    ),
    DB_OP_TIMEOUT_MS,
    'reindexSectionsSelect'
  );

  let i = 1;
  for (const row of rows) {
    await withTimeout(
      db.run(
        `UPDATE theme_sections
         SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [i, row.id]
      ),
      DB_OP_TIMEOUT_MS,
      `reindexSection#${row.id}`
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

    if (!ALLOWED_SECTION_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `نوع القسم غير صحيح. الأنواع المسموحة: ${ALLOWED_SECTION_TYPES.join(', ')}`
      });
    }

    const lastRow = await withTimeout(
      db.get(
        `SELECT MAX(sort_order) as maxOrder FROM theme_sections WHERE page_id = ?`,
        [page.id]
      ),
      DB_OP_TIMEOUT_MS,
      'getMaxSortOrder'
    );

    const nextOrder = Number(lastRow?.maxOrder || 0) + 1;

    await withTimeout(
      db.run(
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
      ),
      DB_OP_TIMEOUT_MS,
      'insertSection'
    );

    const created = await withTimeout(
      db.get(
        `SELECT * FROM theme_sections WHERE page_id = ? ORDER BY id DESC LIMIT 1`,
        [page.id]
      ),
      DB_OP_TIMEOUT_MS,
      'selectCreatedSection'
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
    const section = await withTimeout(
      db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'getSectionById'
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    const updateFields = [];
    const values = [];

    if (req.body.type !== undefined) {
      const newType = normalizeText(req.body.type);
      if (!ALLOWED_SECTION_TYPES.includes(newType)) {
        return res.status(400).json({
          success: false,
          error: `نوع القسم غير صحيح. الأنواع المسموحة: ${ALLOWED_SECTION_TYPES.join(', ')}`
        });
      }
      updateFields.push('type = ?');
      values.push(newType);
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

    await withTimeout(
      db.run(
        `UPDATE theme_sections
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        values
      ),
      DB_OP_TIMEOUT_MS,
      'updateSection'
    );

    const updated = await withTimeout(
      db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'getUpdatedSection'
    );

    await reindexSections(updated.page_id);

    const refreshed = await withTimeout(
      db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'getRefreshedSection'
    );

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
    const section = await withTimeout(
      db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'getSectionById'
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    await withTimeout(
      db.run(`DELETE FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'deleteSection'
    );

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
    const section = await withTimeout(
      db.get(`SELECT * FROM theme_sections WHERE id = ?`, [sectionId]),
      DB_OP_TIMEOUT_MS,
      'getSectionById'
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'القسم غير موجود'
      });
    }

    const lastRow = await withTimeout(
      db.get(
        `SELECT MAX(sort_order) as maxOrder FROM theme_sections WHERE page_id = ?`,
        [section.page_id]
      ),
      DB_OP_TIMEOUT_MS,
      'getMaxSortOrderForDuplicate'
    );

    const nextOrder = Number(lastRow?.maxOrder || 0) + 1;

    await withTimeout(
      db.run(
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
      ),
      DB_OP_TIMEOUT_MS,
      'insertDuplicateSection'
    );

    const created = await withTimeout(
      db.get(
        `SELECT * FROM theme_sections WHERE page_id = ? ORDER BY id DESC LIMIT 1`,
        [section.page_id]
      ),
      DB_OP_TIMEOUT_MS,
      'selectDuplicatedSection'
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

    const rawIds = Array.isArray(req.body.sectionIds) ? req.body.sectionIds : [];
    const sectionIds = rawIds
      .map(id => parseInt(id, 10))
      .filter(id => Number.isFinite(id) && id > 0);

    if (!sectionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'ترتيب الأقسام غير موجود'
      });
    }

    let order = 1;
    for (const sectionId of sectionIds) {
      await withTimeout(
        db.run(
          `UPDATE theme_sections
           SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND page_id = ?`,
          [order, sectionId, page.id]
        ),
        DB_OP_TIMEOUT_MS,
        `reorderSection#${sectionId}`
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
    const rows = await withTimeout(
      db.all(`SELECT * FROM theme_settings ORDER BY id ASC`),
      DB_OP_TIMEOUT_MS,
      'getThemeSettings'
    );
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
    const entries = Object.entries(settings).slice(0, MAX_SETTINGS_KEYS);

    for (const [key, value] of entries) {
      const settingKey = normalizeText(key);
      if (!settingKey) continue;

      await withTimeout(
        db.run(
          `INSERT INTO theme_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON CONFLICT(setting_key)
           DO UPDATE SET
             setting_value = excluded.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [settingKey, String(value ?? '')]
        ),
        DB_OP_TIMEOUT_MS,
        `upsertSetting:${settingKey}`
      );
    }

    const rows = await withTimeout(
      db.all(`SELECT * FROM theme_settings ORDER BY id ASC`),
      DB_OP_TIMEOUT_MS,
      'getThemeSettingsAfterSave'
    );
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