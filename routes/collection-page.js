'use strict';
const router=require('express').Router(),fs=require('node:fs'),path=require('node:path'),db=require('../db/turso-manager');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
router.get('/collection.html',async(req,res,next)=>{
  try{
    const slug=typeof req.query.slug==='string'?req.query.slug:null,id=Number(req.query.id);
    if(!slug&&(!Number.isSafeInteger(id)||id<1))return next();
    const collection=await db.get('SELECT title,description,slug,seo_title,seo_description,image_url,status,online_store FROM collections WHERE '+(slug?'slug=?':'id=?')+' AND deleted_at IS NULL',[slug||id]);
    const preview=req.adminSession&&(req.query.collectionPreview==='1'||req.query.theme_preview==='1');
    if(!collection||!preview&&(collection.status!=='active'||!collection.online_store))return res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Collection unavailable</title><p>Collection unavailable</p>');
    const title=collection.seo_title||collection.title,description=(collection.seo_description||collection.description||collection.title).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const base=process.env.PUBLIC_ORIGIN||req.protocol+'://'+req.get('host'),canonical=new URL('/collection.html',base);canonical.searchParams.set('slug',collection.slug);
    let html=fs.readFileSync(path.join(__dirname,'../public/collection.html'),'utf8');
    html=html.replace(/<title[^>]*>[\s\S]*?<\/title>/,'<title id="pageTitle">'+escape(title+' - Smart Kids Kuwait')+'</title>');
    html=html.replace(/<meta name="description"[^>]*>/,'<meta name="description" id="pageDescription" content="'+escape(description)+'">');
    const metadata={'og:title':title,'og:description':description,'og:url':canonical.href,'og:type':'website'};
    if(collection.image_url)metadata['og:image']=new URL(collection.image_url,base).href;
    html=html.replace('</head>','<link rel="canonical" href="'+escape(canonical.href)+'">'+Object.entries(metadata).map(([key,value])=>'<meta property="'+key+'" content="'+escape(value)+'">').join('')+(preview?'<meta name="robots" content="noindex,nofollow">':'')+'</head>');
    res.set('Cache-Control','no-store').type('html').send(html);
  }catch(error){next(error);}
});
module.exports=router;
