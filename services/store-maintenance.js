'use strict';
// Environment is configured before deployment. No cookie/query bypass for store writes.
function storeMaintenance(env=process.env){
  return (req,res,next)=>{
    const route=req.path.toLowerCase().replace(/\/+$/,'');
    const salesPaused=env.STORE_SALES_PAUSED!==undefined&&env.STORE_SALES_PAUSED!=='0';
    if(salesPaused){
      res.set('X-Store-Sales-Paused','1');
      if(req.method==='POST'&&route==='/api/orders'){
        return res.set('Cache-Control','no-store').status(503).json({success:false,code:'STORE_SALES_PAUSED',error:'البيع موقوف مؤقتًا لحين مراجعة المخزون؛ لا يمكن إتمام الطلب الآن.'});
      }
    }
    const setting=env.STORE_MAINTENANCE;
    if(setting===undefined||setting==='0')return next();
    if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
    if(req.method==='POST'&&['/admin-login','/admin-otp','/admin-logout'].includes(route))return next();
    res.set('Cache-Control','no-store').set('Retry-After','300').status(503).json({success:false,code:'STORE_MAINTENANCE',error:'المتجر تحت الصيانة مؤقتًا؛ الشراء والتعديلات موقوفة حتى اكتمال التحقق.'});
  };
}
module.exports={storeMaintenance};
