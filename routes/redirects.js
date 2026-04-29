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

function appendQuery(destination, originalUrl) {
  const queryIndex = originalUrl.indexOf('?');

  if (queryIndex === -1) {
    return destination;
  }

  const queryString = originalUrl.slice(queryIndex);

  if (!queryString || destination.includes('?')) {
    return destination;
  }

  return `${destination}${queryString}`;
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

router.use(async (req, res, next) => {
  try {
    const method = String(req.method || '').toUpperCase();

    if (method !== 'GET' && method !== 'HEAD') {
      return next();
    }

    const staticAssetPattern = /\.(css|js|mjs|map|png|jpg|jpeg|webp|gif|svg|ico|json|txt|xml|woff|woff2|ttf|otf|mp4|webm|pdf)$/i;

    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/redirects-admin') ||
      staticAssetPattern.test(req.path)
    ) {
      return next();
    }

    await ensureRedirectsTable();

    const sourcePath = normalizeSourcePath(req.path);

    if (!sourcePath) {
      return next();
    }

    const redirect = await db.get(
      `SELECT source_path, destination_path, status_code
       FROM redirects
       WHERE source_path = ?
         AND is_active = 1
       LIMIT 1`,
      [sourcePath]
    );

    if (!redirect?.destination_path) {
      return next();
    }

    const statusCode = Number(redirect.status_code) === 302 ? 302 : 301;
    const destination = appendQuery(redirect.destination_path, req.originalUrl || req.url || '');

    return res.redirect(statusCode, destination);
  } catch (error) {
    console.error('redirect middleware error:', error);
    return next();
  }
});

module.exports = router;
