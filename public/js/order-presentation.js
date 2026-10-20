(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OrderPresentation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>String(v??'').trim();
  function date(value){
    let v=text(value);
    // SQLite CURRENT_TIMESTAMP is UTC, even when its string has no timezone.
    if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(v))v=v.replace(' ','T')+'Z';
    const d=new Date(v);return Number.isNaN(d.getTime())?null:d;
  }
  function formatDate(value,locale='ar-KW'){const d=date(value);return d?d.toLocaleString(locale,{timeZone:'Asia/Kuwait',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}):'—';}
  const locations={kuwait:'الكويت','الكويت':'الكويت',jahra:'الجهراء','al jahra':'الجهراء','الجهراء':'الجهراء',hawalli:'حولي','حولي':'حولي',ahmadi:'الأحمدي','al ahmadi':'الأحمدي','الأحمدي':'الأحمدي',farwaniya:'الفروانية','الفروانية':'الفروانية',mubarakalkabeer:'مبارك الكبير','مبارك الكبير':'مبارك الكبير',capital:'العاصمة','العاصمة':'العاصمة'};
  function address(order){
    let s=order.shipping_address;
    if(typeof s==='string'){try{s=JSON.parse(s);}catch{s=null;}}
    const structured=s&&typeof s==='object';
    const parts=structured?[s.governorate,s.area||s.city,s.block&&'القطعة '+s.block,s.street&&'الشارع '+s.street,s.house&&'المنزل '+s.house,s.address1,s.address2]:[order.customer_district,order.customer_city,...text(order.customer_address).split(/\s+-\s+/)];
    const seen=new Set(['الكويت']),out=[];
    for(const part of parts){const v=text(part);if(!v)continue;const label=locations[v.toLowerCase()]||v;const key=label.toLowerCase();if(!seen.has(key)){seen.add(key);out.push(label);}}
    return [...out,'الكويت'].join('، ');
  }
  function payment(order,english=false){const m=text(order.payment_method)||text(order.notes).match(/(?:^|\|)\s*Payment:\s*(cash|link)(?=\s*(?:\||$))/i)?.[1]||'';return ({cash:english?'Cash on delivery':'الدفع عند الاستلام',link:english?'Payment link':'رابط دفع'})[m.toLowerCase()]|| (english?'Not recorded':'غير مسجلة');}
  function image(value){const v=text(value);try{const u=new URL(v,'https://smartkidskw.com');return v&&['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  return {date,formatDate,address,payment,image,money:v=>`${(Number(v)||0).toFixed(3)} د.ك`};
});
