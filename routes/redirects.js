'use strict';
const router = require('express').Router();
const db = require('../db/turso-manager');
const service = require('../services/redirects');
router.use(async (req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) || req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/redirects-admin') ||
      /\.(css|js|mjs|map|png|jpg|jpeg|webp|gif|svg|ico|json|txt|xml|woff|woff2|ttf|otf|mp4|webm|pdf)$/i.test(req.path)) return next();
  try {
    await require('../db/schema-readiness').assertTables(db, ['redirects']);
    const redirect = await service.resolve(db, req.path, req.originalUrl || req.url);
    if (redirect) return res.redirect(redirect.status, redirect.destination);
  } catch (error) {
    // Refuse unsafe legacy records at runtime too, without rewriting them.
    if (!error.status) console.error('Redirect lookup failed:', error.code || 'Unexpected error');
  }
  next();
});
module.exports = router;
