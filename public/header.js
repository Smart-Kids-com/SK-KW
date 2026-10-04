(function () {
  const HEADER_URL = './header.html';

  function safeText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function updateHeaderCartBadges() {
    let cart = [];

    try {
      cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      cart = [];
    }

    const totalQty = cart.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    document.querySelectorAll('#cartBadge, #menuCartBadge').forEach((badge) => {
      if (!badge) return;

      if (totalQty > 0) {
        badge.style.display = 'flex';
        badge.textContent = totalQty;
      } else {
        badge.style.display = 'none';
        badge.textContent = '0';
      }
    });
  }

  function openMenu() {
    document.body.classList.add('menu-open');

    const menu = document.getElementById('sideMenu');
    if (menu) {
      menu.setAttribute('aria-hidden', 'false');
    }
  }

  function closeMenu() {
    document.body.classList.remove('menu-open');

    const menu = document.getElementById('sideMenu');
    if (menu) {
      menu.setAttribute('aria-hidden', 'true');
    }
  }

  let searchTimer = null;
  let searchController = null;
  let searchRequestId = 0;
  let searchProducts = [];
  let searchTrigger = null;

  function getProductTitle(product) {
    return safeText(product.product_name || product.name || product.title, 'منتج');
  }

  function getProductPrice(product) {
    const price = Number(product.price) || 0;
    const salePrice = Number(product.sale_price) || 0;
    if (salePrice > 0 && price > salePrice) return salePrice;
    return price > 0 ? price : salePrice;
  }

  function getProductImage(product) {
    return safeText(product.primary_image || product.image_url || product.image);
  }

  function getProductUrl(product) {
    const slug = safeText(product.slug);
    if (slug) return `./product-page.html?slug=${encodeURIComponent(slug)}`;
    return `./product-page.html?id=${encodeURIComponent(product.id)}`;
  }

  function cancelSearchRequest() {
    searchRequestId += 1;
    if (searchController) {
      searchController.abort();
      searchController = null;
    }
  }

  function openSearch(trigger) {
    const focusTarget = trigger?.id === 'menuSearchBtn'
      ? document.getElementById('headerSearchBtn')
      : trigger;
    closeMenu();
    searchTrigger = focusTarget || document.activeElement;

    const overlay = document.getElementById('siteSearch');
    const input = document.getElementById('siteSearchInput');
    const status = document.getElementById('siteSearchStatus');
    const results = document.getElementById('siteSearchResults');
    if (!overlay || !input || !status || !results) return;

    clearTimeout(searchTimer);
    cancelSearchRequest();
    input.value = '';
    status.textContent = 'ابدأ بكتابة كلمة للبحث عن المنتجات.';
    results.replaceChildren();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('site-search-open');
    input.focus();
  }

  function closeSearch() {
    const overlay = document.getElementById('siteSearch');
    if (!overlay || !overlay.classList.contains('is-open')) return;

    clearTimeout(searchTimer);
    cancelSearchRequest();
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('site-search-open');

    if (searchTrigger && typeof searchTrigger.focus === 'function') {
      searchTrigger.focus();
    }
    searchTrigger = null;
  }

  function renderSearchResults(products) {
    const results = document.getElementById('siteSearchResults');
    const status = document.getElementById('siteSearchStatus');
    if (!results || !status) return;

    searchProducts = products;
    if (!products.length) {
      results.replaceChildren();
      status.textContent = 'لا توجد منتجات مطابقة.';
      return;
    }

    status.textContent = `${products.length} نتائج`;
    results.innerHTML = products.map((product, index) => {
      const title = getProductTitle(product);
      const image = getProductImage(product);
      const regularPrice = Number(product.price) || 0;
      const salePrice = Number(product.sale_price) || 0;
      const hasSale = salePrice > 0 && regularPrice > salePrice;
      const stock = Math.max(0, Number(product.stock) || 0);
      const purchasable = String(product.status || 'active').toLowerCase() === 'active' && stock > 0;

      return `
        <article class="site-search__item">
          ${image
            ? `<img class="site-search__image" src="${escapeHtml(image)}" alt="" loading="lazy">`
            : '<span class="site-search__image-placeholder" aria-hidden="true">🧸</span>'}
          <div class="site-search__item-content">
            <div class="site-search__item-title">${escapeHtml(title)}</div>
            <div class="site-search__price">
              ${hasSale ? `<span class="site-search__price-old">KWD ${regularPrice.toFixed(3)}</span>` : ''}
              KWD ${getProductPrice(product).toFixed(3)}
            </div>
            <div class="site-search__item-actions">
              <button type="button" data-search-add="${index}" ${purchasable ? '' : 'disabled'}>
                ${purchasable ? 'إضافة للسلة' : 'نفدت الكمية'}
              </button>
              <a href="${getProductUrl(product)}">فتح المنتج</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function searchProductsByQuery(query) {
    const status = document.getElementById('siteSearchStatus');
    const results = document.getElementById('siteSearchResults');
    if (!status || !results) return;

    const normalizedQuery = safeText(query);
    if (!normalizedQuery) {
      cancelSearchRequest();
      searchProducts = [];
      results.replaceChildren();
      status.textContent = 'ابدأ بكتابة كلمة للبحث عن المنتجات.';
      return;
    }

    if (searchController) searchController.abort();
    const controller = new AbortController();
    searchController = controller;
    const requestId = ++searchRequestId;
    status.textContent = 'جاري البحث...';
    results.replaceChildren();

    try {
      const params = new URLSearchParams({
        status: 'active',
        search: normalizedQuery,
        searchMode: 'full',
        limit: '10',
        offset: '0'
      });
      const response = await fetch(`/api/products?${params.toString()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result || !result.success || !Array.isArray(result.data)) {
        throw new Error(result?.error || `تعذر البحث عن المنتجات (HTTP ${response.status})`);
      }
      if (requestId !== searchRequestId) return;

      renderSearchResults(result.data);
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== searchRequestId) return;
      console.error('Global product search failed:', error);
      status.textContent = error.message || 'حدث خطأ أثناء البحث. حاول مرة أخرى.';
    }
  }

  function handleSearchInput(event) {
    clearTimeout(searchTimer);
    const query = event.currentTarget.value;
    searchTimer = setTimeout(() => searchProductsByQuery(query), 250);
  }

  function addSearchResultToCart(index) {
    const product = searchProducts[index];
    if (!product) return;

    const stock = Math.max(0, Number(product.stock) || 0);
    if (String(product.status || 'active').toLowerCase() !== 'active' || stock <= 0) return;

    let cart;
    try {
      cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!Array.isArray(cart)) throw new Error('سلة التسوق غير صالحة');
    } catch (error) {
      console.error('Unable to read cart from local storage:', error);
      document.getElementById('siteSearchStatus').textContent = 'تعذر تحديث سلة التسوق في هذا المتصفح.';
      return;
    }

    const itemId = product.id || product.slug || getProductTitle(product);
    const existingItem = cart.find(item => String(item.id) === String(itemId));
    const nextQuantity = existingItem ? Number(existingItem.quantity || 0) + 1 : 1;
    if (nextQuantity > stock) {
      document.getElementById('siteSearchStatus').textContent = `الكمية المتاحة فقط هي ${stock}.`;
      return;
    }

    if (existingItem) {
      existingItem.quantity = nextQuantity;
    } else {
      cart.push({
        id: itemId,
        name: getProductTitle(product),
        price: getProductPrice(product),
        quantity: 1,
        image: getProductImage(product)
      });
    }

    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Unable to save cart to local storage:', error);
      document.getElementById('siteSearchStatus').textContent = 'تعذر حفظ سلة التسوق في هذا المتصفح.';
      return;
    }

    updateHeaderCartBadges();
    document.getElementById('siteSearchStatus').textContent = `تمت إضافة «${getProductTitle(product)}» إلى السلة.`;
  }

  function bindSearchEvents() {
    const closeButton = document.getElementById('siteSearchClose');
    const overlay = document.getElementById('siteSearch');
    const input = document.getElementById('siteSearchInput');
    const results = document.getElementById('siteSearchResults');

    if (closeButton) closeButton.addEventListener('click', closeSearch);
    if (overlay) {
      overlay.addEventListener('click', event => {
        if (event.target === overlay) closeSearch();
      });
    }
    if (input) input.addEventListener('input', handleSearchInput);
    if (results) {
      results.addEventListener('click', event => {
        const button = event.target.closest('[data-search-add]');
        if (button) addSearchResultToCart(Number(button.dataset.searchAdd));
      });
    }
  }

  function handleSearchClick(event) {
    openSearch(event.currentTarget);
  }

  function getCollectionUrl(collection) {
    const slug = safeText(collection?.slug);
    const id = safeText(collection?.id);

    if (slug) {
      return `./collection.html?slug=${encodeURIComponent(slug)}`;
    }

    return `./collection.html?id=${encodeURIComponent(id)}`;
  }

  async function loadMenuCollections() {
    const list = document.getElementById('collectionsMenuList');
    if (!list) return;

    list.innerHTML = '<a href="./collections.html">جميع المجموعات</a>';

    try {
      const response = await fetch('/api/collections?status=active&limit=80&offset=0&sort=created_at&order=DESC', {
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      });

      const result = await response.json().catch(() => null);

      if (
        !response.ok ||
        !result ||
        !result.success ||
        !Array.isArray(result.data)
      ) {
        return;
      }

      const links = result.data
        .filter((item) => String(item.status || 'active').toLowerCase() !== 'archived')
        .map((item) => {
          const title = escapeHtml(safeText(item.title, 'مجموعة'));
          const url = getCollectionUrl(item);

          return `<a href="${url}">${title}</a>`;
        })
        .join('');

      if (links) {
        list.innerHTML = `<a href="./collections.html">جميع المجموعات</a>${links}`;
      }
    } catch {
      // keep fallback link only
    }
  }

  function bindHeaderEvents() {
    const menuBtn = document.getElementById('menuBtn');
    const menuClose = document.getElementById('menuClose');
    const menuBackdrop = document.getElementById('menuBackdrop');

    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const menuSearchBtn = document.getElementById('menuSearchBtn');

    const collectionsMenuToggle = document.getElementById('collectionsMenuToggle');

    if (menuBtn) {
      menuBtn.addEventListener('click', openMenu);
    }

    if (menuClose) {
      menuClose.addEventListener('click', closeMenu);
    }

    if (menuBackdrop) {
      menuBackdrop.addEventListener('click', closeMenu);
    }

    if (headerSearchBtn) {
      headerSearchBtn.addEventListener('click', handleSearchClick);
    }

    if (menuSearchBtn) {
      menuSearchBtn.addEventListener('click', handleSearchClick);
    }

    bindSearchEvents();

    if (collectionsMenuToggle) {
      collectionsMenuToggle.addEventListener('click', () => {
        const dropdown = collectionsMenuToggle.closest('.side-menu__dropdown');

        if (dropdown) {
          dropdown.classList.toggle('open');
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
        closeSearch();
      }
    });

    window.addEventListener('storage', updateHeaderCartBadges);
    window.updateHeaderCartBadges = updateHeaderCartBadges;

    updateHeaderCartBadges();
    loadMenuCollections();
  }

  async function loadHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;

    try {
      const response = await fetch(HEADER_URL, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to load header.html');
      }

      mount.innerHTML = await response.text();
      bindHeaderEvents();
    } catch (error) {
      console.error('Header load error:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', loadHeader);
})();