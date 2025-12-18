// products-loader.js
// تحميل وعرض المنتجات من ملف JSON (Pagination + Filters + Search) + تصنيف 14 مجموعة

// ===============================
// Collections (14 groups) mapping
// ===============================
const COLLECTIONS = {
  'montessori': {
    name: 'مونتيسوري',
    tags: ['مونتيسوري', 'Montessori'],
    icon: '🎯'
  },
  'stories-world': {
    name: 'عالم القصص والحكايات المصورة',
    tags: ['عالم القصص', 'حكايات مصورة', 'قصص مصورة'],
    icon: '📚'
  },
  'bestsellers': {
    name: 'Smart Kids Kuwait الأطفال المبتكرون الكويت الأفضل مبيعاً',
    tags: ['الأفضل مبيعاً', 'bestseller', 'أكثر مبيعاً', 'best seller'],
    icon: '⭐'
  },
  'latest-releases': {
    name: 'اكتشف أحدث إصداراتنا للأطفال',
    tags: ['اكتشف أحدث إصداراتنا للأطفال', 'إصدارات جديدة', 'أحدث', 'new'],
    icon: '🆕'
  },
  'audio-stories': {
    name: 'قصصي الصوتية المسموعة',
    tags: ['قصصي الصوتية المسموعة', 'قصص صوتية', 'صوتية', 'مسموعة', 'audio'],
    icon: '🎧'
  },
  'interactive-offers': {
    name: 'عروض القصص التفاعلية',
    tags: ['عروض القصص التفاعلية', 'عروض خاصة', 'offer', 'bundle', 'مجموعات'],
    icon: '🎁'
  },
  'single-stories': {
    name: 'القصص المفردة للأطفال',
    tags: ['القصص المفردة للأطفال', 'االقصص المفردة للأطفال', 'قصص مفردة'],
    icon: '📖'
  },
  'self-reading': {
    name: 'أنا أقرأ بنفسي',
    tags: ['أنا أقرأ بنفسي', 'قراءة مستقلة', 'أقرأ بنفسي'],
    icon: '👶'
  },
  'interactive-books': {
    name: 'كتبي التفاعلية الحركية',
    tags: ['كتبي التفاعلية الحركية', 'تفاعلية حركية', 'interactive'],
    icon: '🤸'
  },
  'islamic-library': {
    name: 'عروض مكتبتي الإسلامية',
    tags: ['عروض مكتبتي الإسلامية', 'مكتبة إسلامية', 'إسلامية', 'اسلامية'],
    icon: '🕌'
  },
  'smart-pen': {
    name: 'ابدأ رحلتك مع القلم الناطق',
    tags: ['ابدأ رحلتك مع القلم الناطق', 'قلم ناطق', 'ناطق', 'smart pen'],
    icon: '🖊️'
  },
  'history-encyclopedia': {
    name: 'موسوعات التاريخ المصور',
    tags: ['موسوعات التاريخ المصور', 'تاريخ مصور', 'موسوعات', 'encyclopedia'],
    icon: '🏛️'
  },
  'favorite-books': {
    name: 'الكُتب المُحببة للأطفال',
    tags: ['الكُتب المُحببة للأطفال', 'محببة', 'المفضلة', 'favorite'],
    icon: '💝'
  },
  'all-products': {
    name: 'تسوق جميع منتجاتنا الآن',
    tags: ['تسوق جميع منتجاتنا الآن', 'جميع المنتجات', 'all'],
    icon: '🛍️'
  }
};

// ترتيب أولوية المطابقة (لو المنتج اتطابق مع أكثر من مجموعة)
const COLLECTION_PRIORITY = [
  'interactive-offers',
  'bestsellers',
  'latest-releases',
  'montessori',
  'smart-pen',
  'audio-stories',
  'interactive-books',
  'self-reading',
  'single-stories',
  'stories-world',
  'islamic-library',
  'history-encyclopedia',
  'favorite-books',
  'all-products'
];

function _norm(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

function _getProductTags(product) {
  if (Array.isArray(product.tags)) return product.tags;
  if (product.tags) return String(product.tags).split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

function _matchesCollection(product, collection) {
  const productTags = _getProductTags(product).map(_norm);
  const colTags = (collection.tags || []).map(_norm);

  // 1) match by tags
  for (const pt of productTags) {
    for (const ct of colTags) {
      if (!pt || !ct) continue;
      if (pt.includes(ct) || ct.includes(pt)) return true;
    }
  }

  // 2) fallback match by title/type/body_html
  const hay = _norm(`${product.title || ''} ${product.type || ''} ${product.body_html || ''}`);
  return colTags.some(ct => ct && hay.includes(ct));
}

function getCollectionKeyForProduct(product) {
  for (const key of COLLECTION_PRIORITY) {
    const col = COLLECTIONS[key];
    if (!col) continue;
    if (_matchesCollection(product, col)) return key;
  }
  return null;
}

function getCategoryLabelForProduct(product) {
  const key = getCollectionKeyForProduct(product);
  if (key) return COLLECTIONS[key].name;

  // fallback لو ما اتطابقش مع أي مجموعة
  const t = (product.type && String(product.type).trim()) ? String(product.type).trim() : '';
  return t || 'عام';
}

// ===============================
// ProductsLoader
// ===============================
class ProductsLoader {
  constructor(options = {}) {
    this.pageSize = options.pageSize ?? 24;
    this.maxFilters = options.maxFilters ?? 14;

    this.products = [];
    this.filteredProducts = [];
    this.currentCategory = 'الكل';
    this.query = '';
    this.renderIndex = 0;
    this.searchTimer = null;

    this.init();
  }

  async init() {
    try {
      this.cacheDom();
      this.wireEvents();

      await this.loadProducts();
      this.buildFilters();
      this.applyFiltersAndRender(true);
    } catch (error) {
      console.error('خطأ في تحميل المنتجات:', error);
      this.showError();
    }
  }

  cacheDom() {
    this.productsContainer = document.getElementById('products');
    if (!this.productsContainer) throw new Error('عنصر #products غير موجود في الصفحة');

    this.filtersContainer =
      document.getElementById('categoryFilters') || this.createFiltersContainer();

    this.statsElement =
      document.getElementById('productsStats') || this.createStatsContainer();

    this.loadMoreBtn =
      document.getElementById('loadMoreBtn') || this.createLoadMoreButton();
  }

  wireEvents() {
    // زر تحميل المزيد
    this.loadMoreBtn.addEventListener('click', () => this.renderNextPage());

    // Event delegation لأزرار "إضافة للسلة"
    this.productsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;

      const name = decodeURIComponent(btn.dataset.name || '');
      const price = parseFloat(btn.dataset.price || '0') || 0;
      const id = btn.dataset.id || null;

      if (typeof window.addToCart === 'function') {
        window.addToCart(name, price, id);
      }
    });

    // Event delegation للفلاتر
    this.filtersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-category]');
      if (!btn) return;
      this.filterByCategory(btn.dataset.category);
    });
  }

  async loadProducts() {
    try {
      const response = await fetch('./data/products_grouped.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('فشل في تحميل products_grouped.json');

      const data = await response.json();

      this.products = data
        .filter(product => product && product.published && product.status === 'active')
        .map(product => ({
          id: product.handle || Math.random().toString(36).slice(2),
          name: product.title || 'منتج بدون اسم',
          description: this.extractDescription(product.body_html),
          price: this.extractPrice(product),
          image: this.extractImage(product),
          category: getCategoryLabelForProduct(product),
          tags: _getProductTags(product),
          vendor: product.vendor || 'Smart Kids Kuwait',
          seo: {
            title: product.seo_title,
            description: product.seo_description
          }
        }));

    } catch (error) {
      console.error('خطأ في معالجة البيانات:', error);
      this.products = this.getDefaultProducts();
    }
  }

  extractDescription(bodyHtml) {
    if (!bodyHtml) return 'وصف المنتج غير متوفر';
    const div = document.createElement('div');
    div.innerHTML = bodyHtml;
    const text = div.textContent || div.innerText || '';
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

  extractPrice(product) {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      if (variant && variant.price && Number(variant.price) > 0) {
        return parseFloat(variant.price);
      }
    }

    const productType = (product.type || '').toString().toLowerCase();
    if (productType.includes('كتاب') || productType.includes('قصة')) return 15.0;
    if (productType.includes('علبة') || productType.includes('مونتيسوري')) return 25.0;
    if (productType.includes('عرض') || productType.includes('مجموعة')) return 35.0;

    return 20.0;
  }

  extractImage(product) {
    if (product.images && product.images.length > 0 && product.images[0]?.src) {
      return product.images[0].src;
    }
    return 'https://via.placeholder.com/600x600?text=' + encodeURIComponent(product.title || 'منتج');
  }

  getDefaultProducts() {
    return [
      {
        id: 'default-1',
        name: 'ألعاب الألغاز الذكية',
        description: 'مجموعة ألغاز تطور التفكير النقدي والإبداع',
        price: 18.0,
        image: 'https://via.placeholder.com/600x600?text=ألغاز',
        category: 'ألعاب تعليمية',
        tags: ['تعليمي', 'ذكاء']
      },
      {
        id: 'default-2',
        name: 'روبوت تعليمي',
        description: 'روبوت ذكي لتعلم البرمجة والتحكم',
        price: 45.0,
        image: 'https://via.placeholder.com/600x600?text=روبوت',
        category: 'تكنولوجيا',
        tags: ['روبوت', 'برمجة']
      }
    ];
  }

  // ---------- UI Helpers ----------
  createFiltersContainer() {
    const container = document.createElement('div');
    container.id = 'categoryFilters';
    container.className = 'category-filters';

    const productsContainer = document.getElementById('products');
    if (productsContainer && productsContainer.parentNode) {
      productsContainer.parentNode.insertBefore(container, productsContainer);
    }
    return container;
  }

  createStatsContainer() {
    const statsElement = document.createElement('div');
    statsElement.id = 'productsStats';
    statsElement.className = 'products-stats';

    const productsContainer = document.getElementById('products');
    if (productsContainer && productsContainer.parentNode) {
      productsContainer.parentNode.insertBefore(statsElement, productsContainer);
    }
    return statsElement;
  }

  createLoadMoreButton() {
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.style.margin = '16px 0';

    const btn = document.createElement('button');
    btn.id = 'loadMoreBtn';
    btn.className = 'filter-btn';
    btn.style.padding = '12px 22px';
    btn.style.display = 'none';
    btn.textContent = 'تحميل المزيد';

    wrap.appendChild(btn);

    const productsContainer = document.getElementById('products');
    if (productsContainer && productsContainer.parentNode) {
      productsContainer.parentNode.insertBefore(wrap, productsContainer.nextSibling);
    }
    return btn;
  }

  escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // ---------- Filters & Rendering ----------
  buildFilters() {
    // احسب عدد المنتجات لكل فئة
    const counts = new Map();
    for (const p of this.products) {
      const c = (p.category || 'عام').toString().trim();
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    // خذ أعلى maxFilters فئات (حسب العدد) — وبحد أقصى 14
    const topCategories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFilters);

    const total = this.products.length;

    this.filtersContainer.innerHTML = `
      <button class="filter-btn active" data-category="الكل">الكل (${total})</button>
      ${topCategories.map(([cat, count]) => `
        <button class="filter-btn" data-category="${this.escapeHtml(cat)}">
          ${this.escapeHtml(cat)} (${count})
        </button>
      `).join('')}
    `;
  }

  filterByCategory(category) {
    this.currentCategory = category || 'الكل';

    // Active state
    this.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.category === this.currentCategory));
    });

    this.applyFiltersAndRender(true);
  }

  searchProducts(query) {
    this.query = (query || '').toString();

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.applyFiltersAndRender(true);
    }, 140);
  }

  applyFiltersAndRender(reset = true) {
    const q = this.query.trim().toLowerCase();

    let list = this.products;

    // فلترة بالفئة
    if (this.currentCategory !== 'الكل') {
      list = list.filter(p => (p.category || 'عام') === this.currentCategory);
    }

    // بحث
    if (q) {
      list = list.filter(p => {
        const hay = `${p.name} ${p.description} ${(p.category || '')} ${(p.tags || []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      });
    }

    this.filteredProducts = list;

    if (reset) {
      this.renderIndex = 0;
      this.productsContainer.innerHTML = '';
    }

    if (this.filteredProducts.length === 0) {
      this.productsContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem;">
          <h3>لا توجد منتجات مطابقة</h3>
          <p>جرّب تغيير البحث أو اختيار فئة أخرى</p>
        </div>
      `;
      this.updateStats(0, this.currentCategory);
      this.loadMoreBtn.style.display = 'none';
      return;
    }

    this.renderNextPage();
  }

  renderNextPage() {
    const start = this.renderIndex;
    const end = Math.min(start + this.pageSize, this.filteredProducts.length);
    const batch = this.filteredProducts.slice(start, end);

    const frag = document.createDocumentFragment();
    for (const product of batch) {
      frag.appendChild(this.createProductCard(product));
    }

    this.productsContainer.appendChild(frag);
    this.renderIndex = end;

    this.updateStats(this.filteredProducts.length, this.currentCategory);

    if (this.renderIndex < this.filteredProducts.length) {
      this.loadMoreBtn.style.display = 'inline-block';
      this.loadMoreBtn.textContent = `تحميل المزيد (${this.renderIndex}/${this.filteredProducts.length})`;
    } else {
      this.loadMoreBtn.style.display = 'none';
    }
  }

  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product';
    card.dataset.category = product.category;
    card.dataset.id = product.id;

    const nameEsc = this.escapeHtml(product.name);
    const descEsc = this.escapeHtml(product.description);
    const catEsc = this.escapeHtml(product.category);

    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
      img.src = 'https://via.placeholder.com/600x600?text=' + encodeURIComponent(product.name);
    };

    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-image';
    imgWrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'product-info';
    info.innerHTML = `
      <div class="product-title">${nameEsc}</div>
      <div class="product-description">${descEsc}</div>
      <div class="product-category">التصنيف: ${catEsc}</div>
      <div class="product-price">${Number(product.price).toFixed(3)} د.ك</div>
      <button class="add-to-cart"
              data-name="${encodeURIComponent(product.name)}"
              data-price="${String(product.price)}"
              data-id="${this.escapeHtml(product.id)}">
        إضافة للسلة
      </button>
    `;

    card.appendChild(imgWrap);
    card.appendChild(info);
    return card;
  }

  updateStats(count, category) {
    this.statsElement.innerHTML = `
      <div class="stats-info">
        📊 إجمالي المنتجات: <strong>${count}</strong> منتج
        ${category && category !== 'الكل' ? `في فئة: <strong>${this.escapeHtml(category)}</strong>` : ''}
        ${this.query.trim() ? `— بحث: <strong>${this.escapeHtml(this.query.trim())}</strong>` : ''}
      </div>
    `;
  }

  showError() {
    if (this.productsContainer) {
      this.productsContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: #dc3545;">
          <h3>⚠️ خطأ في تحميل المنتجات</h3>
          <p>حدث خطأ أثناء تحميل قائمة المنتجات. يرجى تحديث الصفحة أو المحاولة لاحقاً.</p>
          <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 1rem; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            تحديث الصفحة
          </button>
        </div>
      `;
    }
    if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'none';
  }
}

// تشغيل المحمل عند تحميل الصفحة
let productsLoader;
document.addEventListener('DOMContentLoaded', function () {
  productsLoader = new ProductsLoader({ pageSize: 24, maxFilters: 14 });
});
