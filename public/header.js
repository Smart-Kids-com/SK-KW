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

  function handleSearchClick() {
    closeMenu();

    const searchInput =
      document.getElementById('mainSearchInput') ||
      document.getElementById('searchInput');

    if (searchInput) {
      searchInput.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      setTimeout(() => {
        searchInput.focus();
      }, 250);

      return;
    }

    window.location.href = './products-full.html';
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