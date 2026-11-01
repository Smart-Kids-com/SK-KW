'use strict';
const router = require('express').Router();
const db = require('../db/turso-manager');
const service = require('../services/redirects');
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.adminSession) return res.status(401).json({ success: false, error: 'Admin sign-in required.' });
  next();
});
const endpoint = fn => async (req, res) => {
  try {
    await require('../db/schema-readiness').assertTables(db, ['redirects']);
    await fn(req, res);
  } catch (error) {
    const conflict = /SQLITE_CONSTRAINT_(UNIQUE|PRIMARYKEY)/.test(error.code || '') || /UNIQUE constraint/i.test(error.message || '');
    const status = conflict ? 409 : error.status || 500;
    if (status === 500) console.error('Redirect administration failed:', error.code || 'Unexpected error');
    res.status(status).json({ success: false, error: conflict ? 'A redirect already uses this source path.' : error.status ? error.message : 'Unable to complete redirect action.' });
  }
};
router.get('/', endpoint(async (req, res) => {
  const data = await db.all('SELECT id,source_path,destination_path,status_code,is_active,notes,created_at,updated_at FROM redirects ORDER BY id DESC');
  res.json({ success: true, data });
}));
router.post('/', endpoint(async (req, res) => res.json({ success: true, data: await service.save(db, req.body || {}) })));
router.patch('/:id', endpoint(async (req, res) => res.json({ success: true, data: await service.save(db, req.body || {}, service.id(req.params.id)) })));
router.delete('/:id', endpoint(async (req, res) => {
  await service.remove(db, service.id(req.params.id));
  res.json({ success: true });
}));
module.exports = router;
