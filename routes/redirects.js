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

async function ensureRedirectsTable() { return require('../db/schema-readiness').assertTables(db, ['redirects']); }

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
