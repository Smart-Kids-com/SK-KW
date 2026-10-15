(function(){
 'use strict';if(new URLSearchParams(location.search).get('theme_preview')!=='1'||parent===window)return;
 // Preview has its own cart/order storage and cannot make storefront mutations.
 const fetchOriginal=window.fetch;
 window.fetch=(input,options={})=>{const method=String(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();if(!['GET','HEAD'].includes(method))return Promise.resolve(new Response(JSON.stringify({success:false,error:'المعاينة للقراءة فقط',code:'THEME_PREVIEW_READ_ONLY'}),{status:403,headers:{'Content-Type':'application/json'}}));return fetchOriginal(input,options);};
 navigator.sendBeacon=()=>false;
 let seed;try{seed=parent.__SKThemePreviewSeed;}catch{}if(!seed)return;
 const memory=new Map([['cart',JSON.stringify(seed.cart)],['last_order',JSON.stringify(seed.order)]]);
 const nativeGet=Storage.prototype.getItem,nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
 const privateKey=key=>/^(cart(?:_|$)|last_order$|abandoned_|sk_checkout_|pixel_|purchase_)/.test(key);
 Storage.prototype.getItem=function(key){return privateKey(String(key))?memory.get(String(key))??null:nativeGet.call(this,key);};
 Storage.prototype.setItem=function(key,value){if(privateKey(String(key)))memory.set(String(key),String(value));else nativeSet.call(this,key,value);};
 Storage.prototype.removeItem=function(key){if(privateKey(String(key)))memory.delete(String(key));else nativeRemove.call(this,key);};
})();
