'use strict';
(async () => {
  const $=id=>document.getElementById(id),collectionPage=location.pathname.endsWith('/collection.html'),query=new URLSearchParams(location.search);
  const grid=$('products'),more=$('loadMoreBtn'),input=$(collectionPage?'searchInput':'mainSearchInput');
  let collection=null,rows=[],offset=0,cursor=null,search='',category='',hasMore=true,controller,sequence=0;
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='sk-catalog-status';grid.before(status);
  const clearSearch=document.createElement('button');clearSearch.type='button';clearSearch.className='sk-empty-clear';clearSearch.textContent='مسح البحث';clearSearch.hidden=true;status.after(clearSearch);clearSearch.onclick=()=>{input.value='';search='';load(true);input.focus();};
  async function json(url,signal){const r=await fetch(url,{signal,cache:'no-store'}),j=await r.json();if(!r.ok||!j.success)throw Error(j.error||'تعذر تحميل المنتجات');return j;}
  async function load(reset=false){
    if(reset){controller?.abort();rows=[];offset=0;cursor=null;hasMore=true;}
    const generation=++sequence;controller=new AbortController();status.textContent='جاري تحميل المنتجات…';more.disabled=true;
    try{
      const params=new URLSearchParams({limit:'24',search,searchMode:'full',includeImages:'true'});
      let url;
      if(collectionPage){params.set('sort',collection.sort_mode||'manual');params.set('offset',offset);if(query.get('collectionPreview')==='1')params.set('preview','1');url='/api/collections/'+collection.id+'/products?'+params;}
      else{params.set('status','active');if(cursor)params.set('cursor',cursor);if(category)params.set('category',category);url='/api/products?'+params;}
      const result=await json(url,controller.signal);if(generation!==sequence)return;
      rows=reset?result.data:[...rows,...result.data];offset=rows.length;cursor=result.pagination?.cursor?.id;
      hasMore=collectionPage?offset<Number(result.pagination?.total||0):!!result.pagination?.hasMore;
      grid.replaceChildren(...rows.map(SKStorefront.card));status.textContent=rows.length?rows.length+' منتج معروض'+(hasMore?' · تتوفر نتائج أخرى':''):'لا توجد منتجات مطابقة';
      more.hidden=!hasMore;more.disabled=false;more.textContent='تحميل المزيد';
      clearSearch.hidden=!!rows.length||!search;
      window.__SKStorefrontCatalog={rows:rows.map(p=>p.id),search,collectionId:collection?.id,hasMore};
    }catch(e){if(e.name==='AbortError'||generation!==sequence)return;status.textContent='تعذر تحميل المنتجات. '+e.message;more.hidden=false;more.disabled=false;more.textContent='إعادة المحاولة';}
  }
  SKStorefront.search(input,value=>{search=value;load(true);});more.removeAttribute('onclick');more.onclick=()=>load(false);
  if(collectionPage){
    if(!query.get('slug')&&!/^[1-9]\d*$/.test(query.get('id')||'')){status.textContent='اختر مجموعة لعرض منتجاتها.';more.hidden=true;return;}
    try{
      const ref=query.has('slug')?'slug/'+encodeURIComponent(query.get('slug')):encodeURIComponent(query.get('id')||'');
      collection=(await json('/api/collections/'+ref+(query.get('collectionPreview')==='1'?'?preview=1':''))).data;
      $('collectionTitle').textContent=collection.title;$('collectionDescription').textContent=collection.description||'';
      const cover=$('collectionCover');if(collection.image_url){cover.src=collection.image_url;cover.hidden=false;}else cover.hidden=true;
      const seoTitle=collection.seo_title||collection.title,description=(collection.seo_description||collection.description||collection.title).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      document.title=seoTitle+' - Smart Kids Kuwait';$('pageDescription').content=description;
      const canonical=new URL(document.querySelector('link[rel=canonical]')?.href||'/collection.html',location.origin);canonical.searchParams.set('slug',collection.slug);
      let link=document.querySelector('link[rel=canonical]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link);}link.href=canonical.href;
      for(const [key,value] of Object.entries({'og:title':seoTitle,'og:description':description,'og:url':canonical.href,'og:type':'website','og:image':collection.image_url?new URL(collection.image_url,location.origin).href:''})){
        let meta=document.querySelector('meta[property="'+key+'"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('property',key);document.head.append(meta);}meta.content=value;
      }
    }catch(e){status.textContent='تعذر تحميل المجموعة. '+e.message;more.hidden=true;return;}
  }
  let previousSettings;
  function themeOptions(settings={}){
    const serialized=JSON.stringify(settings);if(serialized===previousSettings)return;previousSettings=serialized;
    if(collectionPage){const hero=document.querySelector('.collection-hero');hero.hidden=!settings.showHeader;$('collectionTitle').hidden=!settings.showTitle;$('collectionDescription').hidden=!settings.showDescription;$('collectionCover').hidden=!settings.showImage||!collection?.image_url;}
    else{
      const host=$('categoryFilters'),categories=settings.storefrontCategories||[];host.replaceChildren();
      for(const name of categories){const b=document.createElement('button');b.className='filter-btn';b.textContent=name;b.onclick=()=>{category=category===name?'':name;load(true);};host.append(b);}
      const sidebar=$('sidebarFilters');if(sidebar)sidebar.hidden=!categories.length;const toggle=$('filterToggleBtn');if(toggle){toggle.hidden=!categories.length;toggle.onclick=()=>sidebar.classList.toggle('open');}
    }
  }
  window.addEventListener('sk-storefront-settings',e=>themeOptions(e.detail));
  themeOptions(window.__SKStorefrontSettings||{});
  await load(true);
})();
