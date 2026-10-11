'use strict';
const {OrderPricingError}=require('./order-pricing');
const text=value=>String(value??'').trim();
function checkoutDetails(body){
  const mode=body.billingMode || 'same';
  if(!['same','different'].includes(mode))throw new OrderPricingError('نوع عنوان الفاتورة غير صالح');
  const billing={};
  if(mode==='different'){
    for(const field of ['firstName','lastName','address1','city','governorate','phone']){
      billing[field]=text(body.billingAddress?.[field]);
      if(!billing[field]||billing[field].length>500)throw new OrderPricingError('عنوان الفاتورة المختلف غير مكتمل');
    }
    billing.address2=text(body.billingAddress.address2);billing.country='Kuwait';
    if(!require('../config/system').HELPERS.validateKuwaitiPhone(billing.phone))throw new OrderPricingError('هاتف الفاتورة غير صالح');
  }
  const token=text(body.abandonedCheckoutToken)||null;
  if(token && (!/^[A-Za-z0-9_-]{16,150}$/.test(token)))throw new OrderPricingError('معرف السلة غير صالح');
  return {billing_mode:mode,billing_address:JSON.stringify(billing),abandoned_checkout_token:token};
}
module.exports={checkoutDetails};
