'use strict';
// Standalone metadata-only review. Never import server, manager, seeds or migrations.
const fs=require('node:fs'),path=require('node:path');
const envPath=path.resolve(process.argv[2]||'.env.local');
const config={...require('dotenv').parse(fs.readFileSync(envPath)),...process.env};
const required={
  orders:'id order_number customer_name customer_email customer_phone customer_address customer_city subtotal shipping_cost total status notes created_at updated_at discount_code discount_type discount_value discount_amount inventory_managed checkout_key checkout_fingerprint billing_mode billing_address payment_status abandoned_checkout_token invoice_sent_at',
  order_items:'id order_id product_id product_name quantity',
  products:'id product_name slug sku price sale_price image_url stock status product_type vendor category tags seo_title seo_description created_at updated_at on_hand committed unavailable inventory_enabled inventory_blocked',
  product_images:'id product_id image_url sort_order',collections:'id title slug status online_store',collection_products:'collection_id product_id sort_order',
  customers:'id full_name email phone city area status total_orders total_spent accepts_marketing marketing_opt_in last_order_at is_blocked notes created_at updated_at',
  discount_codes:'id code type value is_active minimum_order_amount usage_limit used_count starts_at expires_at notes created_at updated_at',
  abandoned_checkouts:'id checkout_token status customer_name customer_email customer_phone contact_value contact_type first_name last_name address1 address2 city governorate country postal_code notes discount_code discount_amount subtotal shipping_cost total currency cart_items cart_quantity item_count recovered_order_id recovered_order_number last_activity_at created_at updated_at',
  theme_pages:'id page_key title created_at updated_at',theme_sections:'id page_id type title settings_json sort_order is_visible created_at updated_at',theme_settings:'id setting_key setting_value created_at updated_at',
  redirects:'id source_path destination_path status_code is_active notes created_at updated_at',visitor_heartbeats:'id visitor_id page user_agent ip_address source first_seen_at last_seen_at',
  order_inventory:'order_id product_id quantity state',order_checkout_tombstones:'checkout_key checkout_fingerprint deleted_at',
  order_invoice_jobs:'order_id state lease_token lease_until provider_id sent_at updated_at'
};
const identifier=name=>'"'+name.replaceAll('"','""')+'"';
async function inspect(execute,expected){
  const objects=await execute("SELECT type,name,tbl_name FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type,name");
  const tables={},missingTables=[],missingColumns={};
  for(const object of objects.filter(row=>row.type==='table')){
    const columns=await execute(`PRAGMA table_info(${identifier(object.name)})`);
    tables[object.name]={columns:columns.map(row=>({name:row.name,type:row.type,notnull:row.notnull,pk:row.pk})),references:await execute(`PRAGMA foreign_key_list(${identifier(object.name)})`)};
  }
  for(const [table,names] of Object.entries(expected)){
    if(!tables[table]){missingTables.push(table);continue;}
    const missing=names.split(' ').filter(name=>!tables[table].columns.some(row=>row.name===name));if(missing.length)missingColumns[table]=missing;
  }
  const aggregates={};
  const has=(table,...names)=>tables[table]&&names.every(name=>tables[table].columns.some(row=>row.name===name));
  if(has('order_items','order_id')&&has('orders','id'))aggregates.orphanOrderItems=(await execute('SELECT COUNT(*) AS count FROM order_items i LEFT JOIN orders o ON o.id=i.order_id WHERE o.id IS NULL'))[0];
  if(has('order_items','product_id')&&has('products','id'))aggregates.orphanProductItems=(await execute('SELECT COUNT(*) AS count FROM order_items i LEFT JOIN products p ON p.id=i.product_id WHERE p.id IS NULL'))[0];
  if(has('products','stock'))aggregates.legacyStock=(await execute('SELECT COUNT(*) AS products,SUM(COALESCE(stock,0)) AS total_stock FROM products'))[0];
  if(has('orders','status'))aggregates.orderStatusCounts=await execute('SELECT status,COUNT(*) AS count FROM orders GROUP BY status');
  if(has('orders','inventory_managed','status'))aggregates.legacyOrderStatusCounts=await execute('SELECT status,COUNT(*) AS count FROM orders WHERE COALESCE(inventory_managed,0)=0 GROUP BY status');
  if(has('products','stock','on_hand','committed','unavailable'))aggregates.inventory= (await execute(`SELECT COUNT(*) AS products,
    SUM(COALESCE(stock,0)) AS total_stock,SUM(COALESCE(on_hand,0)) AS total_on_hand,SUM(COALESCE(committed,0)) AS total_committed,
    SUM(COALESCE(unavailable,0)) AS total_unavailable,
    SUM(CASE WHEN COALESCE(stock,0)!=MAX(0,COALESCE(on_hand,0)-COALESCE(committed,0)-COALESCE(unavailable,0)) THEN 1 ELSE 0 END) AS stock_mismatch_products,
    SUM(CASE WHEN COALESCE(on_hand,0)=0 AND COALESCE(stock,0)>0 THEN 1 ELSE 0 END) AS zero_on_hand_with_stock,
    SUM(CASE WHEN COALESCE(on_hand,0)<COALESCE(committed,0)+COALESCE(unavailable,0) THEN 1 ELSE 0 END) AS overcommitted_products FROM products`))[0];
  if(has('orders','status','id')&&has('order_items','order_id','quantity'))aggregates.openOrderQuantity=(await execute("SELECT COUNT(DISTINCT o.id) AS orders,SUM(i.quantity) AS units FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.status IN ('pending','processing')"))[0];
  const expectedIndexes=['idx_products_status_id','idx_orders_status_id','idx_orders_abandoned_token','idx_visitor_heartbeats_last_seen','idx_abandoned_status_activity','idx_orders_checkout_key'];
  const expectedTriggers=['order_inventory_insert_guard','order_inventory_reserve','order_inventory_transition_guard','order_inventory_transition','order_inventory_status_guard','order_inventory_status','order_inventory_item_delete','order_inventory_order_delete','abandoned_recover_insert','abandoned_recover_update'];
  const invalidReferences=Object.entries(tables).flatMap(([table,definition])=>definition.references.filter(row=>!tables[row.table]).map(row=>({table,column:row.from,missingParent:row.table})));
  return {objects,tables,missingTables,missingColumns,aggregates,invalidReferences,
    missingIndexes:expectedIndexes.filter(name=>!objects.some(row=>row.type==='index'&&row.name===name)),
    missingTriggers:expectedTriggers.filter(name=>!objects.some(row=>row.type==='trigger'&&row.name===name))};
}
async function connection(url,token,expected){
  if(url?.startsWith('libsql://')||url?.startsWith('https://')){
    const client=require('@libsql/client').createClient({url,authToken:token});
    try{return await inspect(async sql=>Array.from((await client.execute(sql)).rows),expected);}finally{client.close();}
  }
  const file=url?.startsWith('file:')?require('node:url').fileURLToPath(url):path.resolve(config.LOCAL_DATABASE_PATH||'orders.db');
  if(!fs.existsSync(file))throw new Error('missing local database');
  const db=new(require('node:sqlite').DatabaseSync)(file,{readOnly:true});
  try{return await inspect(async sql=>db.prepare(sql).all(),expected);}finally{db.close();}
}
(async()=>{
  if(process.argv.includes('--require-remote') && (!/^(libsql:\/\/|https:\/\/)/.test(config.DATABASE_URL||'') || !config.DATABASE_AUTH_TOKEN)){
    throw new Error('Remote read-only connection must be supplied; local fallback is forbidden');
  }
  const result={reviewedAt:new Date().toISOString(),configurationSource:path.basename(envPath),
    storeTarget:config.DATABASE_URL?/^(libsql:\/\/|https:\/\/)/.test(config.DATABASE_URL)?'configured-remote':'configured-file':'local-default',
    configured:Object.fromEntries(['DATABASE_URL','DATABASE_AUTH_TOKEN','AUTH_DATABASE_URL','AUTH_DATABASE_AUTH_TOKEN','AUTH_SESSION_SECRET','ADMIN_PASSWORD_1','ADMIN_PASSWORD_2','ADMIN_OTP_SECRET','PUBLIC_ORIGIN'].map(key=>[key,Boolean(config[key])]))};
  result.store=await connection(config.DATABASE_URL,config.DATABASE_AUTH_TOKEN,required);
  if(config.AUTH_DATABASE_URL){
    result.authSeparate=config.AUTH_DATABASE_URL!==config.DATABASE_URL;
    try{result.auth=await connection(config.AUTH_DATABASE_URL,config.AUTH_DATABASE_AUTH_TOKEN,{admin_sessions:'token_hash scope credential_version expires_at',admin_login_limits:'bucket_key attempts resets_at',admin_totp_replay:'credential_version last_step'});}
    catch{result.auth={inspectionFailed:true};}
  }
  fs.writeFileSync(path.join(__dirname,'../docs/activation-schema-review.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({target:result.storeTarget,configured:result.configured,missingTables:result.store.missingTables,missingColumns:result.store.missingColumns,aggregates:result.store.aggregates,authConfigured:Boolean(result.auth)},null,2));
})().catch(()=>{console.error('Schema read-only review failed; no credentials or server error details printed.');process.exitCode=1;});
