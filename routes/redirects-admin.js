const express = require('express');
const db = require('../db/turso-manager');

const router = express.Router();

let redirectsTableReadyPromise = null;

function normalizeSourcePath(value) {
  let path = String(value || '').trim();

  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      path = new URL(path).pathname;
    } catch {
      return '';
    }
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return path;
}

function normalizeDestination(value) {
  const destination = String(value || '').trim();

  if (!destination) return '';

  if (
    destination.startsWith('/') ||
    destination.startsWith('https://') ||
    destination.startsWith('http://')
  ) {
    return destination;
  }

  return `/${destination}`;
}

function safeStatusCode(value) {
  const code = Number(value);
  return code === 302 ? 302 : 301;
}

async function ensureRedirectsTable() {
  if (!redirectsTableReadyPromise) {
    redirectsTableReadyPromise = (async () => {
      await db.run(`
        CREATE TABLE IF NOT EXISTS redirects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_path TEXT NOT NULL UNIQUE,
          destination_path TEXT NOT NULL,
          status_code INTEGER DEFAULT 301,
          is_active INTEGER DEFAULT 1,
          notes TEXT DEFAULT '',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_redirects_source_path
        ON redirects(source_path)
      `);

      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_redirects_is_active
        ON redirects(is_active)
      `);

      await db.run(`
        INSERT OR IGNORE INTO redirects
        (source_path, destination_path, status_code, is_active, notes)
        VALUES
        ('/product-page', '/products-full.html', 301, 1, 'Old product page redirect'),
        ('/product-page/', '/products-full.html', 301, 1, 'Old product page redirect')
      `);
    })().catch(error => {
      redirectsTableReadyPromise = null;
      throw error;
    });
  }

  return redirectsTableReadyPromise;
}

router.get('/', async (req, res) => {
  try {
    await ensureRedirectsTable();

    const rows = await db.all(
      `SELECT id, source_path, destination_path, status_code, is_active, notes, created_at, updated_at
       FROM redirects
       ORDER BY id DESC`
    );

    return res.json({
      success: true,
      data: Array.isArray(rows) ? rows : []
    });
  } catch (error) {
    console.error('list redirects error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load redirects'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureRedirectsTable();

    const sourcePath = normalizeSourcePath(req.body?.source_path);
    const destinationPath = normalizeDestination(req.body?.destination_path);
    const statusCode = safeStatusCode(req.body?.status_code);
    const isActive = req.body?.is_active === false || req.body?.is_active === 0 || req.body?.is_active === '0' ? 0 : 1;
    const notes = String(req.body?.notes || '').trim();

    if (!sourcePath || !destinationPath) {
      return res.status(400).json({
        success: false,
        error: 'source_path and destination_path are required'
      });
    }

    await db.run(
      `INSERT INTO redirects
       (source_path, destination_path, status_code, is_active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(source_path) DO UPDATE SET
         destination_path = excluded.destination_path,
         status_code = excluded.status_code,
         is_active = excluded.is_active,
         notes = excluded.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [sourcePath, destinationPath, statusCode, isActive, notes]
    );

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('save redirect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save redirect'
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    await ensureRedirectsTable();

    const id = Number(req.params.id);
    const sourcePath = normalizeSourcePath(req.body?.source_path);
    const destinationPath = normalizeDestination(req.body?.destination_path);
    const statusCode = safeStatusCode(req.body?.status_code);
    const isActive = req.body?.is_active === false || req.body?.is_active === 0 || req.body?.is_active === '0' ? 0 : 1;
    const notes = String(req.body?.notes || '').trim();

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid redirect id'
      });
    }

    if (!sourcePath || !destinationPath) {
      return res.status(400).json({
        success: false,
        error: 'source_path and destination_path are required'
      });
    }

    await db.run(
      `UPDATE redirects
       SET source_path = ?,
           destination_path = ?,
           status_code = ?,
           is_active = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sourcePath, destinationPath, statusCode, isActive, notes, id]
    );

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('update redirect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update redirect'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureRedirectsTable();

    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid redirect id'
      });
    }

    await db.run(
      `DELETE FROM redirects WHERE id = ?`,
      [id]
    );

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('delete redirect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete redirect'
    });
  }
});

module.exports = router;