// تحميل وعرض المنتجات من ملف JSON (Optimized: Pagination + Filters + Search)
class ProductsLoader {
  constructor(options = {}) {
    this.pageSize = options.pageSize ?? 24;          // عدد المنتجات في كل دفعة
    this.maxFilters = options.maxFilters ?? 14;      // أقصى عدد فئات تظهر في الفلاتر
    this.products = [];                               // كل المنتجات
    this.filteredProducts = [];                       // المنتجات بعد البحث/الفلترة
    this.currentCategory = 'الكل';
    this.query = '';
    this.renderIndex = 0;                             // مؤشر pagination
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

    // Filters container
    this.filtersContainer =
      document.getElementById('categoryFilters') || this.createFiltersContainer();

    // Stats container
    this.statsElement =
      document.getElementById('productsStats') || this.createStatsContainer();

    // Load more button
    this.loadMoreBtn =
      document.getElementById('loadMoreBtn') || this.createLoadMoreButton();
  }

  wireEvents() {
    // زر تحميل المزيد
    this.loadMoreBtn.addEventListener('click', () => {
      this.renderNextPage();
    });

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
      const cat = btn.dataset.category;
      this.filterByCategory(cat);
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
          category: product.type || 'عام',
          tags: Array.isArray(product.tags) ? product.tags : (product.tags ? String(product.tags).split(',').map(t => t.trim()) : []),
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
    if (product.images && product.images.length > 0) {
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

  // -------- UI Helpers --------
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

  // -------- Filters & Rendering --------
  buildFilters() {
    // احسب عدد المنتجات لكل فئة
    const counts = new Map();
    for (const p of this.products) {
      const c = (p.category || 'عام').toString().trim();
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    // خذ أعلى maxFilters فئات (حسب العدد)
    const topCategories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFilters);

    // ابنِ أزرار الفلترة
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
    this.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = this.filtersContainer.querySelector(`.filter-btn[data-category="${CSS.escape(this.currentCategory)}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    this.applyFiltersAndRender(true);
  }

  searchProducts(query) {
    this.query = (query || '').toString();

    // debounce
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.applyFiltersAndRender(true);
    }, 120);
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

    // في حال لا توجد نتائج
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

    // ارسم أول صفحة
    this.renderNextPage();
  }

  renderNextPage() {
    const start = this.renderIndex;
    const end = Math.min(start + this.pageSize, this.filteredProducts.length);
    const batch = this.filteredProducts.slice(start, end);

    // Render batch باستخدام Fragment (أسرع)
    const frag = document.createDocumentFragment();

    for (const product of batch) {
      frag.appendChild(this.createProductCard(product));
    }

    this.productsContainer.appendChild(frag);
    this.renderIndex = end;

    // تحديث الإحصائيات
    this.updateStats(this.filteredProducts.length, this.currentCategory);

    // زر تحميل المزيد
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
  productsLoader = new ProductsLoader({
    pageSize: 24,
    maxFilters: 14
  });
});
