function getCandidates() {
  if (
    typeof window !== "undefined" &&
    Array.isArray(window.DATA_URL_CANDIDATES) &&
    window.DATA_URL_CANDIDATES.length
  ) {
    return window.DATA_URL_CANDIDATES;
  }

  // IMPORTANT: includeImages=0 keeps payload fast even with large limits
  return ["/api/products?status=active&limit=800&includeImages=0"];
}

function safeCssEscape(v) {
  if (
    typeof window !== "undefined" &&
    window.CSS &&
    typeof window.CSS.escape === "function"
  ) {
    return window.CSS.escape(v);
  }

  return String(v).replace(/["\\]/g, "\\$&");
}

function normalizeCategoryValue(value) {
  return String(value || "عام").trim() || "عام";
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchJsonWithFallback(urls, timeoutMs = 25000) {
  let lastErr = null;

  const withTimeout = (promise) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Fetch timeout")), timeoutMs)
      ),
    ]);

  for (const url of urls) {
    try {
      const res = await withTimeout(
        fetch(url, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })
      );

      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }

      const json = await withTimeout(res.json());
      return { json, url };
    } catch (error) {
      lastErr = error;
      console.error("Fetch/JSON error for", url, error);
    }
  }

  throw lastErr || new Error("Failed to fetch products");
}

function normalizeProductsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.products)) return payload.products;
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
    if (!this.productsContainer) {
      throw new Error("عنصر products غير موجود");
    }

    this.filtersContainer = document.getElementById("categoryFilters");
    if (!this.filtersContainer) {
      throw new Error("عنصر categoryFilters غير موجود");
    }

    this.statsElement = document.getElementById("productsStats");
    if (!this.statsElement) {
      throw new Error("عنصر productsStats غير موجود");
    }

    this.loadMoreBtn = document.getElementById("loadMoreBtn");
    if (!this.loadMoreBtn) {
      throw new Error("عنصر loadMoreBtn غير موجود");
    }

    this.searchInput =
      document.getElementById("searchInput") ||
      document.querySelector("[data-products-search]");
  }

  wireEvents() {
    this.loadMoreBtn.addEventListener("click", () => this.renderNextPage());

    this.productsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart");
      if (!btn) return;

      const name = decodeURIComponent(btn.dataset.name || "");
      const price = safeNumber(btn.dataset.price, 0);
      const id = btn.dataset.id || "";
      const image = decodeURIComponent(btn.dataset.image || "");

      if (typeof window.addToCart === "function") {
        window.addToCart(name, price, id, btn, image);
      }
    });

    this.filtersContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      this.filterByCategory(btn.dataset.category);
    });

    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchProducts(e.target.value);
      });
    }
  }

  async loadProducts() {
    const { json, url } = await fetchJsonWithFallback(getCandidates(), 25000);
    const rawList = normalizeProductsPayload(json);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new Error(`تم تحميل المصدر (${url}) لكن لا توجد منتجات صالحة.`);
    }

    const normalized = rawList
      .filter((p) => p && typeof p === "object")
      .filter((p) => {
        const status = String(p.status || "").trim().toLowerCase();

        if (p.inStock === false) return false;
        if (p.is_active === false) return false;
        if (status === "inactive") return false;
        if (status === "draft") return false;
        if (status === "archived") return false;

        return true;
      })
      .map((p, idx) => {
        const id = String(
          p.id ??
            p.product_id ??
            p.slug ??
            `product-${idx}`
        );

        const slug = String(p.slug || "").trim();

        const name = String(
          p.name ??
            p.product_name ??
            p.title ??
            "منتج بدون اسم"
        ).trim();

        const fullDescription = String(
          p.description ??
            p.short_description ??
            p.details ??
            ""
        ).trim();

        const shortDescription = fullDescription
          ? fullDescription.length > 140
            ? `${fullDescription.slice(0, 140)}...`
            : fullDescription
          : "وصف المنتج غير متوفر";

        const category = normalizeCategoryValue(
          p.category ??
            p.category_name ??
            p.collection
        );

        const price = safeNumber(
          p.price ?? p.sale_price ?? p.regular_price,
          0
        );

        const image =
          String(
            p.image ??
              p.image_url ??
              p.primary_image ??
              p.thumbnail ??
              p.photo ??
              (Array.isArray(p.images) && p.images[0] && (
                p.images[0].image_url ||
                p.images[0].url
              )) ??
              ""
          ).trim() ||
          `https://via.placeholder.com/600x600?text=${encodeURIComponent(name)}`;

        return {
          id,
          slug,
          name,
          description: shortDescription,
          fullDescription,
          price,
          image,
          category,
        };
      });

    this.products = normalized;
    console.log("✅ Loaded products:", this.products.length, "from", url);
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

    for (const product of this.products) {
      const category = normalizeCategoryValue(product.category);
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    const categories = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFilters);

    this.filtersContainer.innerHTML = `
      <button class="filter-btn active" data-category="الكل">الكل (${total})</button>
      ${categories
        .map(
          ([cat, count]) => `
            <button class="filter-btn" data-category="${this.escapeHtml(cat)}">
              ${this.escapeHtml(cat)} (${count})
            </button>
          `
        )
        .join("")}
    `;
  }

  applyInitialCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = normalizeCategoryValue(params.get("category") || "");

    if (!requestedCategory || requestedCategory === "عام") {
      this.currentCategory = "الكل";
      this.highlightActiveCategory();
      return;
    }

    const exists = this.products.some(
      (p) => normalizeCategoryValue(p.category) === requestedCategory
    );

    this.currentCategory = exists ? requestedCategory : "الكل";
    this.highlightActiveCategory();
  }

  highlightActiveCategory() {
    this.filtersContainer
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));

    const selector = `.filter-btn[data-category="${safeCssEscape(this.currentCategory)}"]`;
    const activeBtn = this.filtersContainer.querySelector(selector);
    if (activeBtn) activeBtn.classList.add("active");
  }

  filterByCategory(category) {
    this.currentCategory = normalizeCategoryValue(category);

    if (!category || this.currentCategory === "عام") {
      this.currentCategory = "الكل";
    }

    this.highlightActiveCategory();
    this.applyFiltersAndRender(true);
  }

  searchProducts(query) {
    this.query = String(query || "");
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFiltersAndRender(true), 120);
  }

  applyFiltersAndRender(reset = true) {
    const q = this.query.trim().toLowerCase();
    let list = [...this.products];

    if (this.currentCategory !== "الكل") {
      list = list.filter(
        (p) => normalizeCategoryValue(p.category) === this.currentCategory
      );
    }

    if (q) {
      list = list.filter((p) => {
        const haystack = `${p.name} ${p.description} ${p.category}`.toLowerCase();
        return haystack.includes(q);
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
    for (const product of batch) {
      frag.appendChild(this.createProductCard(product));
    }

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

    const productUrl = product.slug
      ? `/product-page.html?slug=${encodeURIComponent(product.slug)}`
      : `/product-page.html?id=${encodeURIComponent(product.id)}`;

    const imageLink = document.createElement("a");
    imageLink.href = productUrl;
    imageLink.setAttribute("aria-label", product.name);

    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => {
      img.src =
        "https://via.placeholder.com/600x600?text=" +
        encodeURIComponent(product.name);
    };

    imageLink.appendChild(img);
    imgWrap.appendChild(imageLink);

    const info = document.createElement("div");
    info.className = "product-info";

    const nameEsc = this.escapeHtml(product.name);
    const descEsc = this.escapeHtml(product.description);
    const catEsc = this.escapeHtml(product.category);
    const priceValue = safeNumber(product.price, 0);

    info.innerHTML = `
      <a href="${productUrl}" class="product-title-link" style="text-decoration:none;color:inherit;">
        <div class="product-title">${nameEsc}</div>
      </a>

      <div class="product-description">${descEsc}</div>
      <div class="product-category">التصنيف: ${catEsc}</div>
      <div class="product-price">${priceValue.toFixed(3)} د.ك</div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a href="${productUrl}" class="view-product-btn" style="text-decoration:none;">
          عرض المنتج
        </a>

        <button
          class="add-to-cart"
          data-name="${encodeURIComponent(product.name)}"
          data-price="${String(priceValue)}"
          data-id="${this.escapeHtml(product.id)}"
          data-image="${encodeURIComponent(product.image)}"
          type="button"
        >
          إضافة للسلة
        </button>
      </div>
    `;

    card.appendChild(imgWrap);
    card.appendChild(info);
    return card;
  }

  updateStats(count) {
    this.statsElement.innerHTML = `
      <div class="stats-info">
        إجمالي المنتجات: <strong>${count}</strong>
      </div>
    `;
  }

  showError(err) {
    const msg = err && err.message ? err.message : "Unknown error";

    if (this.productsContainer) {
      this.productsContainer.innerHTML = `
        <div style="text-align:center; grid-column:1/-1; padding:3rem; color:#dc3545;">
          <h3>⚠️ خطأ في تحميل المنتجات</h3>
          <p style="color:#333; background:rgba(255,255,255,0.92); display:inline-block; padding:10px 14px; border-radius:12px;">
            ${this.escapeHtml(msg)}
          </p>
          <p style="margin-top:10px; color:#333;">تأكد أن API المنتجات تعمل بشكل صحيح</p>
        </div>
      `;
    }

    if (this.loadMoreBtn) {
      this.loadMoreBtn.style.display = "none";
    }

    if (this.statsElement) {
      this.updateStats(0);
    }
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.productsLoader = null;

  document.addEventListener("DOMContentLoaded", () => {
    window.productsLoader = new ProductsLoader({
      pageSize: 24,
      maxFilters: 14,
    });
  });
}