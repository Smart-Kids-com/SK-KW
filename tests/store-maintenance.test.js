'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {storeMaintenance}=require('../services/store-maintenance');
function request(setting,method,path,salesPaused){let passed=false,result={headers:{}};const res={set(k,v){result.headers[k]=v;return this;},status(value){result.status=value;return this;},json(value){result.body=value;return this;}};
  storeMaintenance({...setting===undefined?{}:{STORE_MAINTENANCE:setting},...salesPaused===undefined?{}:{STORE_SALES_PAUSED:salesPaused}})({method,path},res,()=>{passed=true;});return {...result,passed};}

test('sales pause rejects orders while allowing authenticated inventory routes to reach their guards',()=>{
  for(const path of ['/api/orders','/API/ORDERS/']){
    const result=request('0','POST',path,'1');assert.equal(result.status,503);assert.equal(result.body.code,'STORE_SALES_PAUSED');assert.equal(result.passed,false);
  }
  assert.equal(request('0','PUT','/api/products/1','1').passed,true);
  assert.equal(request('0','GET','/api/products','1').passed,true);
  assert.equal(request('1','PUT','/api/products/1','1').passed,false);
  assert.equal(request('0','POST','/api/orders','0').passed,true);
  assert.equal(request('0','POST','/api/orders','typo').passed,false);
});
test('maintenance blocks purchases and all store mutations without cookie/query bypass',()=>{
  for(const method of ['POST','PUT','PATCH','DELETE'])for(const path of ['/api/orders','/api/products/1','/api/orders/1/status','/api/abandoned-checkouts/save','/api/theme/settings','/api/discounts']){
    const result=request('1',method,path);assert.equal(result.passed,false);assert.equal(result.status,503);assert.equal(result.body.code,'STORE_MAINTENANCE');assert.equal(result.headers['Cache-Control'],'no-store');
  }
});
test('maintenance permits read-only browsing and password/OTP/logout verification',()=>{
  for(const method of ['GET','HEAD','OPTIONS'])assert.equal(request('1',method,'/api/products').passed,true);
  for(const path of ['/admin-login','/ADMIN-OTP/','/admin-logout'])assert.equal(request('1','POST',path).passed,true);
});
test('maintenance opens only with explicit zero or absent setting; unknown values block writes',()=>{
  for(const setting of ['0',undefined])assert.equal(request(setting,'POST','/api/orders').passed,true);
  for(const setting of ['true','false','', 'typo'])assert.equal(request(setting,'POST','/api/orders').status,503);
});
test('maintenance is wired before all application routes',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
  assert.ok(source.indexOf('storeMaintenance()')>source.indexOf('const app = express()'));
  assert.ok(source.indexOf('storeMaintenance()')<source.indexOf('app.use(adminAuth.context)'));
});
