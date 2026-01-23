// products-loader.js
// يدعم JSON بصيغتين:
// 1) Array عادي: [ {id,name,price,...}, ... ]
// 2) Grouped Object: { "Category A": [..], "Category B":[..] } أو داخل groups/collections/categories

let DATA_URL_CANDIDATES = [];
try {
  const mod = require("./DATA_URL_CANDIDATES");
  if (mod && Array.isArray(mod.DATA_URL_CANDIDATES)) DATA_URL_CANDIDATES = mod.DATA_URL_CANDIDATES;
} catch (_) {}

function getCandidates() {
  // ✅ مهم: اقرأ window.DATA_URL_CANDIDATES وقت الاستخدام (حتى لو اتعرّف بعد تحميل الملف)
  if (typeof window !== "undefined" && Array.isArray(window.DATA_URL_CANDIDATES) && window.DATA_URL_CANDIDATES.length) {
    return window.DATA_URL_CANDIDATES;
  }
  if (Array.isArray(DATA_URL_CANDIDATES) && DATA_URL_CANDIDATES.length) return DATA_URL_CANDIDATES;
  return ["/products_grouped.json", "/products.json"];
}

function safeCssEscape(v) {
  if (typeof window !== "undefined" && window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(v);
  return String(v).replace(/["\\]/g, "\\$&");
}

async function fetchJsonWithFallback(urls, timeoutMs = 20000) {
  let lastErr = null;

  const withTimeout = (p) =>
    Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error("Fetch timeout")), timeoutMs)),
    ]);

  for (const url of urls) {
    try {
      const res = await withTimeout(fetch(url, { cache: "no-store" }));
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} for ${url}`); continue; }

      // ⚠️ ملف ضخم: حاول تقرأ كـ JSON مباشرة (قد يفشل لو كبير جدًا)
      const json = await withTimeout(res.json());
      return json;
    } catch (e) {
      lastErr = e;
      console.error("Fetch/JSON error for", url, e);
    }
  }
  throw lastErr || new Error("Failed to fetch products JSON");
}

function flattenGroupedData(data) {
  // لو Array رجّعه كما هو
  if (Array.isArray(data)) return data;

  // أحيانًا يكون الملف ملفوف داخل مفتاح
  if (data && typeof data === "object") {
    const wrapped =
      (data.products && (Array.isArray(data.products) || typeof data.products === "object")) ? data.products :
      (data.data && (Array.isArray(data.data) || typeof data.data === "object")) ? data.data :
      data;

    if (Array.isArray(wrapped)) return wrapped;

    // احتمالات شائعة
    const candidate =
      wrapped.groups && typeof wrapped.groups === "object" ? wrapped.groups :
      wrapped.collections && typeof wrapped.collections === "object" ? wrapped.collections :
      wrapped.categories && typeof wrapped.categories === "object" ? wrapped.categories :
      wrapped;

    const out = [];
    for (const [groupName, value] of Object.entries(candidate)) {
      if (Array.isArray(value)) {
        for (const p of value) {
          if (p && typeof p === "object") {
            if (!p.category) p.category = groupName;
            out.push(p);
          }
        }
      } else if (value && typeof value === "object" && Array.isArray(value.items)) {
        for (const p of value.items) {
          if (p && typeof p === "object") {
            if (!p.category) p.category = groupName;
            out.push(p);
          }
        }
      }
    }
    return out;
  }

  return [];
}

class ProductsLoader {
  constructor(options = {}) {
    this.pageSize = options.pageSize ?? 24;
    this.maxFilters = options.maxFilters ?? 14;

    this.products = [];
    this.filteredProducts = [];
    this.currentCategory = "الكل";
    this.query = "";
    this.renderIndex = 0;
    this.searchTimer = null;

    this.init();
  }

  async init() {
    try {
      if (typeof document === "undefined") return;

      this.cacheDom();
      this.wireEvents();

      await this.loadProducts();

      this.buildFiltersFromData();
      this.applyInitialCategoryFromURL();
      this.applyFiltersAndRender(true);
    } catch (error) {
      console.error("ProductsLoader init error:", error);
      this.showError(error);
    }
  }

  cacheDom() {
    this.productsContainer = document.getElementById("products");
    if (!this.productsContainer) throw new Error("عنصر products غير موجود");

    this.filtersContainer = document.getElementById("categoryFilters");
    if (!this.filtersContainer) throw new Error("عنصر categoryFilters غير موجود");

    this.statsElement = document.getElementById("productsStats");
    if (!this.statsElement) throw new Error("عنصر productsStats غير موجود");

    this.loadMoreBtn = document.getElementById("loadMoreBtn");
    if (!this.loadMoreBtn) throw new Error("عنصر loadMoreBtn غير موجود");
  }

  wireEvents() {
    this.loadMoreBtn.addEventListener("click", () => this.renderNextPage());

    this.productsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart");
      if (!btn) return;

      const name = decodeURIComponent(btn.dataset.name || "");
      const price = parseFloat(btn.dataset.price || "0") || 0;
      const id = btn.dataset.id || null;

      if (typeof window.addToCart === "function") {
        window.addToCart(name, price, id, btn);
      }
    });

    this.filtersContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      this.filterByCategory(btn.dataset.category);
    });
  }

  async loadProducts() {
    // ✅ استخدم getCandidates بدل متغير ثابت
    const data = await fetchJsonWithFallback(getCandidates(), 25000);

    const rawList = flattenGroupedData(data);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new Error("الملف تم تحميله لكن لم يتم العثور على منتجات (صيغة غير مدعومة أو تفكيك grouped فشل).");
    }

    const list = rawList.filter(p => p && typeof p === "object" && p.inStock !== false);

    this.products = list.map((p, idx) => {
      const id = p.id ?? p.handle ?? `${idx}-${Math.random().toString(36).slice(2)}`;
      const name = p.name ?? p.title ?? "منتج بدون اسم";
      const description = (p.description ?? p.body_html ?? "").toString() || "وصف المنتج غير متوفر";
      const category = (p.category ?? p.type ?? "عام").toString().trim() || "عام";

      let price = parseFloat(p.price);
      if (!Number.isFinite(price)) {
        if (Array.isArray(p.variants) && p.variants[0]?.price != null) {
          const v = parseFloat(p.variants[0].price);
          price = Number.isFinite(v) ? v : 0;
        } else {
          price = 0;
        }
      }

      let image = p.image;
      if (!image && Array.isArray(p.images) && p.images[0]?.src) image = p.images[0].src;
      if (!image) image = "https://via.placeholder.com/600x600?text=" + encodeURIComponent(name);

      return { id, name, description, price, image, category };
    });
  }

  escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  buildFiltersFromData() {
    const total = this.products.length;

    const counts = new Map();
    for (const p of this.products) {
      const c = (p.category || "عام").toString().trim();
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    const list = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFilters);

    this.filtersContainer.innerHTML = `
      <button class="filter-btn active" data-category="الكل">الكل (${total})</button>
      ${list.map(([cat, count]) => `
        <button class="filter-btn" data-category="${this.escapeHtml(cat)}">
          ${this.escapeHtml(cat)} (${count})
        </button>
      `).join("")}
    `;
  }

  applyInitialCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const categoryName = (params.get("category") || "").trim();
    this.currentCategory = categoryName || "الكل";
    if (this.currentCategory !== "الكل") this.filterByCategory(this.currentCategory);
  }

  filterByCategory(category) {
    this.currentCategory = category || "الكل";

    this.filtersContainer.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    const selector = `.filter-btn[data-category="${safeCssEscape(this.currentCategory)}"]`;
    const activeBtn = this.filtersContainer.querySelector(selector);
    if (activeBtn) activeBtn.classList.add("active");

    this.applyFiltersAndRender(true);
  }

  searchProducts(query) {
    this.query = (query || "").toString();
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFiltersAndRender(true), 120);
  }

  applyFiltersAndRender(reset = true) {
    const q = this.query.trim().toLowerCase();
    let list = this.products;

    if (this.currentCategory !== "الكل") {
      list = list.filter(p => (p.category || "عام") === this.currentCategory);
    }

    if (q) {
      list = list.filter(p => {
        const hay = `${p.name} ${p.description} ${p.category}`.toLowerCase();
        return hay.includes(q);
      });
    }

    this.filteredProducts = list;

    if (reset) {
      this.renderIndex = 0;
      this.productsContainer.innerHTML = "";
    }

    if (this.filteredProducts.length === 0) {
      this.productsContainer.innerHTML = `
        <div style="text-align:center; grid-column:1/-1; padding:3rem;">
          <h3>لا توجد منتجات مطابقة</h3>
          <p>جرّب تغيير البحث أو اختيار مجموعة أخرى</p>
        </div>
      `;
      this.updateStats(0);
      this.loadMoreBtn.style.display = "none";
      return;
    }

    this.renderNextPage();
  }

  renderNextPage() {
    const start = this.renderIndex;
    const end = Math.min(start + this.pageSize, this.filteredProducts.length);
    const batch = this.filteredProducts.slice(start, end);

    const frag = document.createDocumentFragment();
    for (const product of batch) frag.appendChild(this.createProductCard(product));
    this.productsContainer.appendChild(frag);

    this.renderIndex = end;
    this.updateStats(this.filteredProducts.length);

    if (this.renderIndex < this.filteredProducts.length) {
      this.loadMoreBtn.style.display = "inline-block";
      this.loadMoreBtn.textContent = `تحميل المزيد (${this.renderIndex}/${this.filteredProducts.length})`;
    } else {
      this.loadMoreBtn.style.display = "none";
    }
  }

  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product";

    const imgWrap = document.createElement("div");
    imgWrap.className = "product-image";

    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => { img.src = "https://via.placeholder.com/600x600?text=" + encodeURIComponent(product.name); };
    imgWrap.appendChild(img);

    const info = document.createElement("div");
    info.className = "product-info";

    const nameEsc = this.escapeHtml(product.name);
    const descEsc = this.escapeHtml(product.description);
    const catEsc = this.escapeHtml(product.category);
    const priceSafe = Number.isFinite(product.price) ? product.price : 0;

    info.innerHTML = `
      <div class="product-title">${nameEsc}</div>
      <div class="product-description">${descEsc}</div>
      <div class="product-category">التصنيف: ${catEsc}</div>
      <div class="product-price">${priceSafe.toFixed(3)} د.ك</div>
      <button class="add-to-cart"
              data-name="${encodeURIComponent(product.name)}"
              data-price="${String(priceSafe)}"
              data-id="${this.escapeHtml(product.id)}">
        إضافة للسلة
      </button>
    `;

    card.appendChild(imgWrap);
    card.appendChild(info);
    return card;
  }

  updateStats(count) {
    this.statsElement.innerHTML = `
      <div class="stats-info">
        إجمالي المنتجات: <strong>${count}</strong>
        ${this.currentCategory !== "الكل" ? `— مجموعة: <strong>${this.escapeHtml(this.currentCategory)}</strong>` : ""}
        ${this.query.trim() ? `— بحث: <strong>${this.escapeHtml(this.query.trim())}</strong>` : ""}
      </div>
    `;
  }

  showError(err) {
    const msg = (err && err.message) ? err.message : "Unknown error";
    this.productsContainer.innerHTML = `
      <div style="text-align:center; grid-column:1/-1; padding:3rem; color:#dc3545;">
        <h3>⚠️ خطأ في تحميل المنتجات</h3>
        <p style="color:#333; background:rgba(255,255,255,0.85); display:inline-block; padding:10px 14px; border-radius:12px;">
          ${this.escapeHtml(msg)}
        </p>
        <p style="margin-top:10px; color:#fff;">
          إذا كان الملف ضخم جدًا (سطر واحد وحجمه كبير) قد يفشل المتصفح في قراءته.
        </p>
        <button onclick="location.reload()" style="padding:10px 20px; margin-top:1rem; background:#007bff; color:white; border:none; border-radius:10px; cursor:pointer;">
          تحديث الصفحة
        </button>
      </div>
    `;
    this.loadMoreBtn.style.display = "none";
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.productsLoader = null;
  document.addEventListener("DOMContentLoaded", () => {
    window.productsLoader = new ProductsLoader({ pageSize: 24, maxFilters: 14 });
  });
}
