/* ===========================
   Collections (14 groups)
   (Copied from collections-manager.js)
   =========================== */

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
    tags: ['الأفضل مبيعاً', 'bestseller', 'أكثر مبيعاً'],
    icon: '⭐'
  },
  'latest-releases': {
    name: 'اكتشف أحدث إصداراتنا للأطفال',
    tags: ['اكتشف أحدث إصداراتنا للأطفال', 'إصدارات جديدة', 'أحدث'],
    icon: '🆕'
  },
  'audio-stories': {
    name: 'قصصي الصوتية المسموعة',
    tags: ['قصصي الصوتية المسموعة', 'صوتية', 'مسموعة'],
    icon: '🎧'
  },
  'interactive-offers': {
    name: 'عروض القصص التفاعلية',
    tags: ['عروض القصص التفاعلية', 'تفاعلية', 'عروض خاصة'],
    icon: '🎁'
  },
  'single-stories': {
    name: 'القصص المفردة للأطفال',
    tags: ['القصص المفردة للأطفال', 'االقصص المفردة للأطفال', 'قصص مفردة'],
    icon: '📖'
  },
  'self-reading': {
    name: 'أنا أقرأ بنفسي',
    tags: ['أنا أقرأ بنفسي', 'قراءة مستقلة'],
    icon: '👶'
  },
  'interactive-books': {
    name: 'كتبي التفاعلية الحركية',
    tags: ['كتبي التفاعلية الحركية', 'تفاعلية حركية'],
    icon: '🤸'
  },
  'islamic-library': {
    name: 'عروض مكتبتي الإسلامية',
    tags: ['عروض مكتبتي الإسلامية', 'إسلامية', 'مكتبة إسلامية'],
    icon: '🕌'
  },
  'smart-pen': {
    name: 'ابدأ رحلتك مع القلم الناطق',
    tags: ['ابدأ رحلتك مع القلم الناطق', 'قلم ناطق', 'ناطق'],
    icon: '🖊️'
  },
  'history-encyclopedia': {
    name: 'موسوعات التاريخ المصور',
    tags: ['موسوعات التاريخ المصور', 'تاريخ مصور', 'موسوعات'],
    icon: '🏛️'
  },
  'favorite-books': {
    name: 'الكُتب المُحببة للأطفال',
    tags: ['الكُتب المُحببة للأطفال', 'محببة', 'المفضلة'],
    icon: '💝'
  },
  'all-products': {
    name: 'تسوق جميع منتجاتنا الآن',
    tags: ['تسوق جميع منتجاتنا الآن', 'جميع المنتجات'],
    icon: '🛍️'
  }
};

// أولوية المطابقة (استبعدنا all-products من التصنيف لأنه خاص بعرض الكل)
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
  'favorite-books'
];

function norm(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

function getProductTags(product) {
  if (Array.isArray(product.tags)) return product.tags;
  if (product.tags) return String(product.tags).split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

function matchesCollection(product, collection) {
  const productTags = getProductTags(product).map(norm);
  const colTags = (collection.tags || []).map(norm);

  // 1) tags
  for (const pt of productTags) {
    for (const ct of colTags) {
      if (!pt || !ct) continue;
      if (pt.includes(ct) || ct.includes(pt)) return true;
    }
  }

  // 2) fallback in title/type/body_html
  const hay = norm(`${product.title || ''} ${product.type || ''} ${product.body_html || ''}`);
  return colTags.some(ct => ct && hay.includes(ct));
}

function getCollectionKeyForProduct(product) {
  for (const key of COLLECTION_PRIORITY) {
    const col = COLLECTIONS[key];
    if (!col) continue;
    if (matchesCollection(product, col)) return key;
  }
  return null;
}

function getCategoryLabelForProduct(product) {
  const key = getCollectionKeyForProduct(product);
  if (key && COLLECTIONS[key]) return COLLECTIONS[key].name;
  return (product.type && String(product.type).trim()) ? String(product.type).trim() : 'عام';
}

function getIconForCategoryName(categoryName) {
  const name = String(categoryName || '').trim();
  for (const key of Object.keys(COLLECTIONS)) {
    if (COLLECTIONS[key].name === name) return COLLECTIONS[key].icon || '📁';
  }
  return '📁';
}

function cssEscapeSafe(value) {
  const s = String(value ?? '');
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
  // fallback بسيط
  return s.replace(/["\\]/g, '\\$&');
}

/* ===========================
   Products Loader
   =========================== */

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
    if (!this.productsContainer) throw new Error('عنصر products غير موجود');

    this.filtersContainer =
      document.getElementById('categoryFilters') || this.createFiltersContainer();

    this.statsElement =
      document.getElementById('productsStats') || this.createStatsContainer();

    this.loadMoreBtn =
      document.getElementById('loadMoreBtn') || this.createLoadMoreButton();
  }

  wireEvents() {
    this.loadMoreBtn.addEventListener('click', () => this.renderNextPage());

    // Add to cart delegation
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

    // Filters delegation
    this.filtersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-category]');
      if (!btn) return;
      this.filterByCategory(btn.dataset.category);
    });
  }

  async loadProducts() {
    try {
      const response = await fetch('./data/products_grouped.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('فشل في تحميل الملف');

      const data = await response.json();

      this.products = data
        .filter(product => product.published && product.status === 'active')
        .map(product => ({
          id: product.handle || Math.random().toString(36).slice(2),
          name: product.title || 'منتج بدون اسم',
          description: this.extractDescription(product.body_html),
          price: this.extractPrice(product),
          image: this.extractImage(product),

          // هنا المهم: تصنيف المنتج حسب مجموعاتك الـ 14
          category: getCategoryLabelForProduct(product),

          tags: Array.isArray(product.tags)
            ? product.tags
            : (product.tags ? String(product.tags).split(',').map(t => t.trim()).filter(Boolean) : []),

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
      if (variant.price && variant.price > 0) {
        return parseFloat(variant.price);
      }
    }

    const productType = (product.type || '').toLowerCase();
    if (productType.includes('كتاب') || productType.includes('قصة')) return 15.0;
    if (productType.includes('علبة') || productType.includes('مونتيسوري')) return 25.0;
    if (productType.includes('عرض') || productType.includes('مجموعة')) return 35.0;
    return 20.0;
  }

  extractImage(product) {
    if (product.images && product.images.length > 0) return product.images[0].src;
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
        category: 'مونتيسوري',
        tags: ['تعليمي', 'ذكاء']
      },
      {
        id: 'default-2',
        name: 'روبوت تعليمي',
        description: 'روبوت ذكي لتعلم البرمجة والتحكم',
        price: 45.0,
        image: 'https://via.placeholder.com/600x600?text=روبوت',
        category: 'تسوق جميع منتجاتنا الآن',
        tags: ['روبوت', 'برمجة']
      }
    ];
  }

  /* UI Helpers */
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
    const s = String(str ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* Filters & Rendering */
  buildFilters() {
    const total = this.products.length;

    // نبني قائمة الفلاتر حسب المجموعات (بدون all-products لأنه يساوي "الكل")
    const keys = Object.keys(COLLECTIONS).filter(k => k !== 'all-products');

    const items = keys.map(key => {
      const col = COLLECTIONS[key];
      const name = col.name;
      const icon = col.icon || '📁';
      const count = this.products.filter(p => p.category === name).length;
      return { name, icon, count };
    });

    // لو maxFilters أقل من 13 (اختياري)
    const list = items.slice(0, this.maxFilters);

    this.filtersContainer.innerHTML = `
      <button class="filter-btn active" data-category="الكل">🛍️ الكل (${total})</button>
      ${list.map(it => `
        <button class="filter-btn" data-category="${this.escapeHtml(it.name)}">
          ${this.escapeHtml(it.icon)} ${this.escapeHtml(it.name)} (${it.count})
        </button>
      `).join('')}
    `;
  }

  filterByCategory(category) {
    this.currentCategory = category || 'الكل';

    this.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

    const selector = `.filter-btn[data-category="${cssEscapeSafe(this.currentCategory)}"]`;
    const activeBtn = this.filtersContainer.querySelector(selector);
    if (activeBtn) activeBtn.classList.add('active');

    this.applyFiltersAndRender(true);
  }

  searchProducts(query) {
    this.query = (query || '').toString();

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.applyFiltersAndRender(true);
    }, 120);
  }

  applyFiltersAndRender(reset = true) {
    const q = this.query.trim().toLowerCase();
    let list = this.products;

    if (this.currentCategory !== 'الكل') {
      list = list.filter(p => (p.category || 'عام') === this.currentCategory);
    }

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
    const icon = this.escapeHtml(getIconForCategoryName(product.category));

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
      <div class="product-category">التصنيف: ${icon} ${catEsc}</div>
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
  productsLoader = new ProductsLoader({
    pageSize: 24,
    maxFilters: 14
  });
});
