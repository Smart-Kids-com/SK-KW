'use strict';
const router=require('express').Router(),db=require('../db/turso-manager');
router.post('/validate',async(req,res)=>{
 try{
  const p=await require('../services/order-pricing').priceOrder(db,req.body?.items,req.body?.code);
  res.json({success:true,data:{code:p.discount_code,type:p.discount_type,value:p.discount_value,label:p.discount_label,subtotal:p.subtotal,shipping_cost:p.shipping_cost,discount_amount:p.discount_amount,total:p.total,subtotal_after_discount:Math.max(0,p.subtotal-(p.discount_type==='free_shipping'?0:p.discount_amount))}});
 }catch(e){res.status(e.status||500).json({success:false,error:e.status?e.message:'تعذر التحقق من الخصم'})}
});
module.exports=router;
