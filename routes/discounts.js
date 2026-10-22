'use strict';
const router=require('express').Router(),db=require('../db/turso-manager'),D=require('../services/discounts'),{randomUUID}=require('node:crypto');
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res,next)}catch(e){res.status(e.status||(/UNIQUE constraint/.test(e.message)?409:500)).json({success:false,error:e.status?e.message:/UNIQUE constraint/.test(e.message)?'Code already exists':'Discount operation failed'})}};
router.use(wrap(async(req,res,next)=>{if(!(await db.all('PRAGMA table_info(discount_codes)')).some(c=>c.name==='rules_json'))return res.status(503).json({success:false,error:'Discount editor migration required'});next()}));
const mapped=d=>({...d,status:D.status(d),rules:D.rules(d)});
const get=async id=>{if(!/^[1-9]\d*$/.test(String(id))){const e=Error('Invalid ID');e.status=400;throw e}const d=await db.get('SELECT * FROM discount_codes WHERE id=?',[id]);if(!d){const e=Error('Discount not found');e.status=404;throw e}return d};
async function save(body,old){
 const d=D.normalize(body,old),r=D.rules(d);
 if(r.scope!=='order'){
  const table=r.scope==='products'?'products':'collections',rows=await db.all(`SELECT id FROM ${table} WHERE id IN(${r.ids.map(()=>'?')})`,r.ids);
  if(rows.length!==r.ids.length){const e=Error('Some targets no longer exist');e.status=400;throw e}
 }
 const keys=Object.keys(d);
 if(old)await db.run(`UPDATE discount_codes SET ${keys.map(k=>k+'=?')},updated_at=CURRENT_TIMESTAMP WHERE id=?`,[...keys.map(k=>d[k]),old.id]);
 else await db.run(`INSERT INTO discount_codes(${keys.join(',')}) VALUES(${keys.map(()=>'?')})`,keys.map(k=>d[k]));
 return mapped(await db.get('SELECT * FROM discount_codes WHERE UPPER(TRIM(code))=?',[d.code]));
}
router.get('/stats/summary',wrap(async(req,res)=>{const row=await db.get(`SELECT COUNT(*) total,SUM(CASE WHEN is_active=1 AND archived=0 AND (starts_at IS NULL OR starts_at='' OR julianday(starts_at)<=julianday('now')) AND (expires_at IS NULL OR expires_at='' OR julianday(expires_at)>julianday('now')) THEN 1 ELSE 0 END) active FROM discount_codes`);res.json({success:true,data:{totalDiscounts:Number(row.total),activeDiscounts:Number(row.active||0),inactiveDiscounts:Number(row.total)-Number(row.active||0)}})}));
router.get('/targets',wrap(async(req,res)=>{
 const type=req.query.type==='collections'?'collections':'products',name=type==='products'?'product_name':'title',limit=50,offset=Math.max(0,parseInt(req.query.offset)||0),q=String(req.query.search||'').slice(0,200);
 const rows=await db.all(`SELECT id,${name} name,status FROM ${type} WHERE ${name} LIKE ? ORDER BY ${name},id LIMIT ? OFFSET ?`,['%'+q+'%',limit,offset]),n=await db.get(`SELECT COUNT(*) n FROM ${type} WHERE ${name} LIKE ?`,['%'+q+'%']);res.json({success:true,data:rows,pagination:{total:Number(n.n),offset,limit}});
}));
router.get('/',wrap(async(req,res)=>{
 const q=req.query,where=[],args=[],limit=Math.min(100,Math.max(1,parseInt(q.limit)||25)),offset=Math.max(0,parseInt(q.offset)||0);
 const state=`CASE WHEN archived=1 THEN 'archived' WHEN is_active=0 THEN 'draft' WHEN julianday(starts_at)>julianday('now') THEN 'scheduled' WHEN julianday(expires_at)<=julianday('now') THEN 'expired' ELSE 'active' END`;
 for(const k of ['method','type'])if(q[k]){where.push(k+'=?');args.push(q[k])}
 if(q.is_active!==undefined&&q.is_active!==''){where.push('is_active=?');args.push(Number(q.is_active)?1:0)}
 if(q.status){where.push(`(${state})=?`);args.push(q.status)}
 if(q.search){where.push('(code LIKE ? OR title LIKE ? OR notes LIKE ?)');args.push(...Array(3).fill('%'+String(q.search).slice(0,200)+'%'))}
 const suffix=where.length?' WHERE '+where.join(' AND '):'',sort=['code','title','value','used_count','created_at','updated_at','starts_at','expires_at'].includes(q.sort)?q.sort:'updated_at',order=q.order==='ASC'?'ASC':'DESC';
 const rows=await db.all(`SELECT * FROM discount_codes${suffix} ORDER BY ${sort} ${order},id ${order} LIMIT ? OFFSET ?`,[...args,limit,offset]),n=await db.get('SELECT COUNT(*) n FROM discount_codes'+suffix,args);
 res.json({success:true,data:rows.map(mapped),pagination:{total:Number(n.n),limit,offset,totalPages:Math.ceil(Number(n.n)/limit)}});
}));
router.post('/',wrap(async(req,res)=>res.status(201).json({success:true,data:await save(req.body)})));
router.get('/:id',wrap(async(req,res)=>res.json({success:true,data:mapped(await get(req.params.id))})));
router.put('/:id',wrap(async(req,res)=>res.json({success:true,data:await save(req.body,await get(req.params.id))})));
router.post('/:id/duplicate',wrap(async(req,res)=>{const d=await get(req.params.id);res.status(201).json({success:true,data:await save({...d,code:d.code.slice(0,60)+'-COPY-'+randomUUID().slice(0,8),title:(d.title||d.code)+' — Copy',is_active:0,archived:0,used_count:0})})}));
router.post('/:id/toggle',wrap(async(req,res)=>{const d=await get(req.params.id);res.json({success:true,data:await save({is_active:Number(d.is_active)?0:1},d)})}));
for(const action of ['archive','restore'])router.post('/:id/'+action,wrap(async(req,res)=>res.json({success:true,data:await save({archived:action==='archive'?1:0},await get(req.params.id))})));
router.delete('/:id',wrap(async(req,res)=>{const d=await get(req.params.id);if(Number(d.used_count)||await db.get('SELECT id FROM orders WHERE discount_code=? LIMIT 1',[d.code]))return res.status(409).json({success:false,error:'A used discount must be archived to preserve order history'});await db.run('DELETE FROM discount_codes WHERE id=?',[d.id]);res.json({success:true,data:{deletedId:d.id}})}));
module.exports=router;
