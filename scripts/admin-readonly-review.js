'use strict';
// Opt-in loopback-only review of a COPY. Does not load production environment files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function start({snapshot,port=5610}={}){
 if(!snapshot||!Number.isInteger(port)||port<1024||port>65534)throw Error('A SQLite snapshot and loopback port are required');
 const source=fs.realpathSync(snapshot),isolation=require('../tests/security-support');
 fs.copyFileSync(source,path.join(isolation.directory,'store.db'));
 process.env.PUBLIC_ORIGIN='http://127.0.0.1:'+port;process.env.ADMIN_PASSWORD_1='Local-Readonly-Review!2026';process.env.STORE_SALES_PAUSED='1';
 const {DatabaseSync}=require('node:sqlite'),copy=path.join(isolation.directory,'store.db');
 function digest(){const d=new DatabaseSync(copy,{readOnly:true});try{const hash=crypto.createHash('sha256');for(const t of d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()){const name='"'+t.name.replaceAll('"','""')+'"';hash.update(t.name+JSON.stringify(d.prepare('SELECT * FROM '+name).all().map(r=>JSON.stringify(Object.values(r),(_,v)=>typeof v==='bigint'?String(v):v)).sort()))}return hash.digest('hex')}finally{d.close()}}
 const before=digest();const {createClient}=require('@libsql/client'),auth=createClient({url:process.env.AUTH_DATABASE_URL});await auth.executeMultiple(fs.readFileSync(path.join(__dirname,'../db/auth-schema.sql'),'utf8'));auth.close();
 const db=require('../db/turso-manager');await db.open();await(await db.ensureTursoClient()).execute('PRAGMA query_only=ON');
 const counts={};for(const table of ['products','orders','customers','collections','discount_codes'])counts[table]=Number((await db.get('SELECT COUNT(*) n FROM '+table)).n);
 counts.periodOrders=Number((await db.get("SELECT COUNT(*) n FROM orders WHERE julianday(created_at)>=julianday('2026-10-01T00:00:00Z') AND julianday(created_at)<=julianday('2026-10-31T23:59:59Z')")).n);
 const express=require('express'),wrapper=express();wrapper.use((req,res,next)=>{res.set('Cache-Control','no-store').set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; font-src 'self'; form-action 'self'; object-src 'none'");
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!['/admin-login','/admin-otp','/admin-logout'].includes(req.path))return res.status(403).json({success:false,error:'Read-only local review: writes are disabled'});next()});
 wrapper.get('/js/meta-pixel.js',(req,res)=>res.type('js').send('window.fbq=function(){};window.SmartKidsPixel={trackPurchase:function(){},trackInitiateCheckout:function(){}};'));
 const actual=require('../server');wrapper.use(actual);const server=wrapper.listen(port,'127.0.0.1');await require('node:events').once(server,'listening');
 const helper=express();helper.get('/',(req,res)=>res.type('html').send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font:17px Tahoma;max-width:650px;margin:30px auto;padding:20px;line-height:1.9}code{display:block;direction:ltr;background:#eee;padding:12px}</style><h1>مراجعة محلية للقراءة فقط</h1><p>نسخة من بيانات المتجر، وليست اتصالًا بالإنتاج. التعديلات والبريد وMeta محجوبة. بيانات الدخول التالية تجريبية فقط.</p><a href="http://127.0.0.1:${port}/admin?next=/products-admin">فتح الإدارة</a><code>Local-Readonly-Review!2026</code><code id="otp"></code><script>async function update(){const d=await fetch('/otp').then(r=>r.json());document.getElementById('otp').textContent=d.otp}update();setInterval(update,1000)</script></html>`));
 helper.get('/otp',(req,res)=>res.json({otp:require('speakeasy').totp({secret:process.env.ADMIN_OTP_SECRET,encoding:'base32'})}));
 helper.get('/state',(req,res)=>res.json({counts,storeUnchanged:digest()===before,readOnly:true,externalEffects:isolation.blockedEffects.length}));const helperServer=helper.listen(port+1,'127.0.0.1');await require('node:events').once(helperServer,'listening');
 const base='http://127.0.0.1:'+port;fs.writeFileSync('admin-readonly-review-state.local.json',JSON.stringify({base,helper:base.replace(':'+port,':'+(port+1)),pid:process.pid,directory:isolation.directory,counts},null,2));
 const close=async()=>{server.closeAllConnections();helperServer.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>helperServer.close(r))]);actual.locals.adminAuth.close();const unchanged=digest()===before;(await db.ensureTursoClient()).close();if(!unchanged)throw Error('Review copy changed')};
 process.on('SIGTERM',()=>close().finally(()=>process.exit(0)));return {base,counts,close,unchanged:()=>digest()===before,password:process.env.ADMIN_PASSWORD_1,otp:()=>require('speakeasy').totp({secret:process.env.ADMIN_OTP_SECRET,encoding:'base32'})};
}
if(require.main===module){const i=process.argv.indexOf('--snapshot'),p=process.argv.indexOf('--port');start({snapshot:i>=0?process.argv[i+1]:null,port:p>=0?Number(process.argv[p+1]):5610}).then(d=>console.log('Read-only admin review ready: '+d.base)).catch(()=>{console.error('Read-only review could not start');process.exitCode=1})}
module.exports={start};
