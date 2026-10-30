'use strict';
const router = require('express').Router();
const db = require('../db/turso-manager');
router.get('/global-search', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.adminSession) return res.status(401).json({success:false,error:'Admin sign-in required.'});
  const text = String(req.query.q || '').trim();
  if (text.length > 80) return res.status(400).json({success:false,error:'Search query too long.'});
  const data = {Products:[],Orders:[],Collections:[],Customers:[]};
  if (text.length < 2) return res.json({success:true,data});
  const q = '%' + text.replace(/[\\%_]/g, '\\$&') + '%';
  try {
    const rows = await Promise.all([
      db.all("SELECT id,product_name AS label FROM products WHERE product_name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 5", [q,q]),
      db.all("SELECT id,order_number AS label FROM orders WHERE order_number LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 5", [q,q]),
      db.all("SELECT id,title AS label FROM collections WHERE deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\') ORDER BY id DESC LIMIT 5", [q,q]),
      db.all("SELECT id,full_name AS label FROM customers WHERE full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 5", [q,q,q])
    ]);
    const paths = ['/product-edit.html','/order-details.html','/collection-edit.html','/customers-view.html'];
    Object.keys(data).forEach((key,index) => { data[key] = rows[index].map(row => ({label:String(row.label || '#'+row.id),url:paths[index]+'?id='+row.id})); });
    return res.json({success:true,data});
  } catch {
    return res.status(500).json({success:false,error:'Search unavailable. Please try again.'});
  }
});
module.exports = router;
