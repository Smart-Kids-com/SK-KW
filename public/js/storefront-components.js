'use strict';
// Shared catalog cards, scoped search and cart feedback. Prices remain server-authoritative at checkout.
(() => {
  if(window.SKStorefront)return;
  const element = (tag,text,cls) => { const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n; };
  const title = p => p.product_name || p.name || p.title || 'منتج';
  const image = p => p.primary_image || p.image_url || p.image || '';
  const productURL = p => '/product-page.html?' + (p.slug ? 'slug='+encodeURIComponent(p.slug) : 'id='+Number(p.id));
  const readCart = () => { try { const value=JSON.parse(localStorage.getItem('cart')||'[]');return Array.isArray(value)?value:[]; } catch { return []; } };
  let notice, timer;
  function cartFeedback(product) {
    if(!notice){notice=element('a',undefined,'sk-floating-cart');notice.href='/cart.html';notice.setAttribute('aria-label','عرض السلة');document.body.append(notice);}
    const count=readCart().reduce((sum,p)=>sum+Math.max(0,Number(p.quantity)||0),0);
    // Count reconciliation must not shorten the two-second success message.
    if(!product&&count>0&&notice.classList.contains('expanded')){
      notice.querySelector('.sk-cart-count').textContent=String(count);
      for(const badge of document.querySelectorAll('#cartBadge,#menuCartBadge')){badge.textContent=count;badge.style.display='flex';}
      return;
    }
    notice.hidden=!count;notice.replaceChildren();
    const icon=element('img');icon.src='/brand/cart.svg';icon.alt='';notice.append(icon,element('span',String(count),'sk-cart-count'));
    for(const badge of document.querySelectorAll('#cartBadge,#menuCartBadge')){badge.textContent=count;badge.style.display=count?'flex':'none';}
    if(product){
      clearTimeout(timer);notice.classList.add('expanded');
      const details=element('span',undefined,'sk-cart-message');
      if(image(product)){const img=element('img');img.src=image(product);img.alt='';details.append(img);}
      const text=element('span');text.append(element('strong','تمت الإضافة إلى عربة التسوق بنجاح'),element('span',title(product)),element('small','عرض السلة'));details.append(text);notice.append(details);
      timer=setTimeout(()=>notice.classList.remove('expanded'),2000);
    }else notice.classList.remove('expanded');
  }
  function error(message){let status=document.querySelector('#sk-cart-error');if(!status){status=element('p',undefined,'sk-cart-error');status.id='sk-cart-error';status.setAttribute('role','alert');document.body.append(status);}status.textContent=message;setTimeout(()=>status.remove(),5000);}
  const pending=new Set();
  async function add(product,button) {
    const id=Number(product.id);if(!Number.isSafeInteger(id)||id<1||pending.has(id))return;
    if(product.has_options||product.variants?.length){location.href=productURL(product);return;}
    pending.add(id);if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
    try{
      const response=await fetch('/api/products/'+id,{cache:'no-store'}),json=await response.json();
      if(!response.ok||!json.success)throw Error('تعذر التحقق من المنتج. حاول مرة أخرى.');
      const current=json.data;if(current.status!=='active')throw Error('هذا المنتج غير متاح للشراء');
      const available=Number(current.available??current.stock??0),cart=readCart(),existing=cart.find(p=>String(p.id)===String(id)),quantity=Number(existing?.quantity||0)+1;
      if(!Number.isFinite(available)||quantity>available)throw Error('الكمية المطلوبة غير متاحة');
      const price=Number(current.sale_price)>0&&Number(current.sale_price)<Number(current.price)?Number(current.sale_price):Number(current.price);
      if(existing)existing.quantity=quantity;else cart.push({id,slug:current.slug||'',name:title(current),price,quantity:1,image:image(current)});
      localStorage.setItem('cart',JSON.stringify(cart));window.dispatchEvent(new Event('cartUpdated'));cartFeedback(current);
    }catch(e){error(e.message||'تعذرت الإضافة إلى السلة');}
    finally{pending.delete(id);if(button){button.disabled=false;button.removeAttribute('aria-busy');}}
  }
  function card(p){
    const article=element('article',undefined,'product sk-product-card'),media=element('div',undefined,'product-image sk-product-media'),link=element('a');link.href=productURL(p);link.setAttribute('aria-label',title(p));
    if(image(p)){const img=element('img');img.src=image(p);img.alt=title(p);img.loading='lazy';link.append(img);}else link.append(element('span','لا توجد صورة','sk-no-image'));
    const sale=Number(p.sale_price)>0&&Number(p.sale_price)<Number(p.price),available=Number(p.available??p.stock??0)>0&&p.status==='active';
    media.append(link);if(sale)media.append(element('span','عرض خاص','sk-sale-label'));
    const view=element('a',undefined,'sk-card-view');view.href=productURL(p);view.setAttribute('aria-label','عرض '+title(p));const eye=element('img');eye.src='/brand/eye.svg';eye.alt='';view.append(eye);media.append(view);
    const addButton=element('button',undefined,'sk-card-cart');addButton.type='button';addButton.disabled=!available;addButton.setAttribute('aria-label',available?'إضافة '+title(p)+' إلى السلة':'نفدت الكمية');
    const icon=element('img');icon.src='/brand/cart.svg';icon.alt='';addButton.append(icon);addButton.onclick=e=>{e.preventDefault();e.stopPropagation();add(p,addButton);};if(available)media.append(addButton);
    const info=element('div',undefined,'product-info'),name=element('a',title(p),'product-title');name.href=productURL(p);name.dir='auto';
    const price=element('div',undefined,'product-price sk-card-price');if(sale)price.append(element('del',Number(p.price).toFixed(3)+' د.ك'));price.append(element('strong',Number(sale?p.sale_price:p.price).toFixed(3)+' د.ك'));
    info.append(name,price,element('span',available?'':'نفدت الكمية','sk-card-availability'+(available?'':' sk-sold-out')));article.append(media,info);return article;
  }
  function search(input,onSearch){
    input.placeholder='ابحث عن منتج';input.setAttribute('aria-label','ابحث عن منتج');input.removeAttribute('oninput');
    const host=element('div',undefined,'sk-catalog-search'),icon=element('img'),clear=element('button','×');icon.src='/brand/search.svg';icon.alt='';clear.type='button';clear.setAttribute('aria-label','مسح البحث');
    input.before(host);host.append(icon,input,clear);let timer;
    input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>onSearch(input.value),250);};clear.onclick=()=>{input.value='';clearTimeout(timer);onSearch('');input.focus();};
  }
  window.SKStorefront={card,search,add,cartFeedback};
  // One page scroll area, with a reserved viewport strip for the two controls.
  // Checkout and administration keep their existing layout and scrolling.
  if(/^\/(?:index|products-full|product-page|collection|collections|cart)\.html$/.test(location.pathname)||location.pathname==='/')document.body.classList.add('sk-storefront-dock');
  window.addEventListener('storage',e=>{if(e.key==='cart')cartFeedback();});window.addEventListener('cartUpdated',()=>cartFeedback());window.addEventListener('cart-updated',()=>cartFeedback());
  window.addEventListener('pageshow',()=>cartFeedback());
  // Existing cart pages write localStorage directly; observing its final value keeps the one badge accurate.
  let previous=localStorage.getItem('cart');setInterval(()=>{const next=localStorage.getItem('cart');if(previous!==next){previous=next;cartFeedback();}},500);
})();
