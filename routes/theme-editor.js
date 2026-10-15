'use strict';
const router=require('express').Router(),db=require('../db/turso-manager'),service=require('../services/theme-editor');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({success:false,error:e.message});if(e.message==='Invalid theme document')return res.status(400).json({success:false,error:e.message});next(e);}};
router.get('/published',wrap(async(req,res)=>{const s=await service.state(db);res.set('Cache-Control','no-store').json({success:true,data:{document:s.published,revision:s.publishedRevision}});}));
router.get('/editor/state',wrap(async(req,res)=>res.set('Cache-Control','no-store').json({success:true,data:await service.state(db,req.query.theme||'current')})));
router.put('/editor/draft',wrap(async(req,res)=>res.json({success:true,data:await service.save(db,req.body.document,req.body.revision,'draft',req.query.theme||'current')})));
router.post('/editor/publish',wrap(async(req,res)=>{const s=await service.state(db,req.query.theme||'current');if(s.revision!==req.body.revision)return res.status(409).json({success:false,error:'Save the latest draft before publishing'});res.json({success:true,data:await service.save(db,s.draft,s.revision,'publish',req.query.theme||'current')});}));
router.get('/editor/history',wrap(async(req,res)=>{await service.state(db);res.json({success:true,data:await db.all('SELECT id,kind,created_at FROM theme_editor_history WHERE theme_id=? ORDER BY id DESC LIMIT 50',[service.themeId(req.query.theme||'current')])});}));
router.post('/editor/restore/:id',wrap(async(req,res)=>{await service.state(db);const row=await db.get('SELECT document_json FROM theme_editor_history WHERE id=? AND theme_id=?',[req.params.id,service.themeId(req.query.theme||'current')]);if(!row)return res.status(404).json({success:false,error:'Version not found'});res.json({success:true,data:await service.save(db,JSON.parse(row.document_json),req.body.revision,'restore',req.query.theme||'current')});}));
router.get('/editor/assets',wrap(async(req,res)=>{
  await service.state(db);const originals=[];const base=path.resolve(__dirname,'../public');
  function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(originals.length>=800)return;const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.isFile()&&/\.(png|jpe?g|webp|gif|svg)$/i.test(item.name))originals.push({id:path.relative(base,p).replaceAll('\\','/'),name:item.name,url:'/'+path.relative(base,p).replaceAll('\\','/'),original:true});}}
  walk(base);const uploaded=await db.all('SELECT id,name,mime,bytes,width,height FROM theme_editor_media ORDER BY created_at DESC LIMIT 200');
  res.json({success:true,data:[...uploaded.map(m=>({...m,url:'/api/theme/media/'+m.id})),...originals]});
}));
router.post('/editor/assets',wrap(async(req,res)=>{
  await service.state(db);const {name,mime,data,width,height}=req.body;
  if(typeof name!=='string'||name.length>150||!['image/png','image/jpeg','image/webp'].includes(mime)||typeof data!=='string'||data.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>12000||height>12000)return res.status(400).json({success:false,error:'Choose PNG, JPEG or WebP up to 2 MiB'});
  const buffer=Buffer.from(data,'base64');const valid=mime==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
  if(!valid||buffer.length>2*1024*1024)return res.status(400).json({success:false,error:'Invalid image contents or size'});
  const id=crypto.createHash('sha256').update(buffer).digest('hex');await db.run('INSERT OR IGNORE INTO theme_editor_media(id,name,mime,bytes,width,height,data_base64) VALUES(?,?,?,?,?,?,?)',[id,name,mime,buffer.length,width,height,data]);
  res.status(201).json({success:true,data:{id,name,mime,width,height,url:'/api/theme/media/'+id}});
}));
router.get('/media/:id',wrap(async(req,res)=>{if(!/^[a-f0-9]{64}$/.test(req.params.id))return res.sendStatus(404);await require('../db/schema-readiness').assertTables(db,['theme_editor_media']);const m=await db.get('SELECT mime,data_base64 FROM theme_editor_media WHERE id=?',[req.params.id]);if(!m)return res.sendStatus(404);res.set({'Content-Type':m.mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'",'Cache-Control':'public,max-age=31536000,immutable'}).send(Buffer.from(m.data_base64,'base64'));}));
router.get('/editor/themes',wrap(async(req,res)=>res.json({success:true,data:await service.list(db)})));
router.post('/editor/themes',wrap(async(req,res)=>res.status(201).json({success:true,data:await service.duplicate(db,req.body.source||'published',req.body.name)})));
router.put('/editor/themes/:id/name',wrap(async(req,res)=>res.json({success:true,data:await service.rename(db,req.params.id,req.body.name)})));
module.exports=router;
