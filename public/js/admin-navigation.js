'use strict';

// This is the sole source of the administration menu markup and image geometry.
(() => {
  const menu = `
<nav class="sk-nav-stack" aria-label="Sidebar navigation">
          <a class="sk-nav-item" style="--nav-hit-top:22.381477%;--nav-hit-bottom:27.012128%" href="/admin-enhanced"><img src="/admin-assets/smartify.png" alt="Smartify"></a>
          <a class="sk-nav-item" style="--nav-overlap:27.12572%;--nav-hit-top:30.319735%;--nav-hit-bottom:20.286659%" href="/admin-enhanced"><img src="/admin-assets/home.png" alt="Home"></a>
          <a class="sk-nav-item" style="--nav-overlap:25.14345%;--nav-hit-top:32.855568%;--nav-hit-bottom:17.971334%" href="/orders-admin.html"><img src="/admin-assets/orders.png" alt="Orders"><span class="sk-nav-badge" id="ordersCountBadge">—</span></a>
          <a class="sk-nav-item" style="--nav-overlap:23.05685%;--nav-hit-top:30.760750%;--nav-hit-bottom:25.468578%" href="/products-admin"><img src="/admin-assets/products.png" alt="Products"></a>
          <a class="sk-nav-item" style="--nav-overlap:18.49540%;--nav-hit-top:19.354839%;--nav-hit-bottom:17.302053%" href="/inventory-admin.html"><img src="/admin-assets/inventory-icon.png" alt="Inventory"></a>
          <a class="sk-nav-item" style="--nav-overlap:19.68972%;--nav-hit-top:29.437707%;--nav-hit-bottom:27.232635%" href="/collections-admin"><img src="/admin-assets/collections.png" alt="Collections"></a>
          <a class="sk-nav-item" style="--nav-overlap:24.51748%;--nav-hit-top:24.586549%;--nav-hit-bottom:31.863286%" href="/customers-admin"><img src="/admin-assets/customers.png" alt="Customers"></a>
          <a class="sk-nav-item" style="--nav-overlap:28.22118%;--nav-hit-top:27.783903%;--nav-hit-bottom:28.665932%" href="/theme-admin"><img src="/admin-assets/theme.png" alt="Theme"></a>
          <a class="sk-nav-item" style="--nav-overlap:27.96035%;--nav-hit-top:30.429989%;--nav-hit-bottom:27.122381%" href="/discounts-admin"><img src="/admin-assets/Discounts.png" alt="Discounts"></a>
          <a class="sk-nav-item" style="--nav-overlap:31.03568%;--nav-hit-top:32.361111%;--nav-hit-bottom:31.666667%" href="/redirects-admin.html"><img src="/admin-assets/redirects_bottom.png" alt="Redirects — إدارة إعادة توجيه الروابط"></a>
          <a class="sk-nav-item" style="--nav-overlap:29.86257%;--nav-hit-top:25.468578%;--nav-hit-bottom:31.973539%" href="/abandoned-checkouts-admin.html"><img src="/admin-assets/abandoned-checkout.png" alt="Abandoned checkouts"></a>
          <form method="POST" action="/admin-logout" style="--nav-overlap:15.12780%"><button class="sk-nav-logout" type="submit">تسجيل الخروج</button></form>
        </nav>
  `;
  const host = document.querySelector('[data-admin-navigation]');
  if (!host) return;
  const page = document.body.dataset.adminPage;
  host.innerHTML = `<div class="sk-nav-mobile-actions"><a href="/admin-enhanced">Home</a></div><details class="sk-nav-details"><summary>قائمة الإدارة <span aria-hidden="true">☰</span></summary><div class="sk-nav-shell">${menu}</div></details>`;
  if (page === 'orders') host.querySelector('#ordersCountBadge').id = 'desktopOrdersCountBadge';
  const paths = {
    home: '/admin-enhanced', orders: '/orders-admin.html', products: '/products-admin',
    inventory: '/inventory-admin.html', collections: '/collections-admin',
    customers: '/customers-admin', theme: '/theme-admin', discounts: '/discounts-admin',
    redirects: '/redirects-admin.html', abandoned: '/abandoned-checkouts-admin.html'
  };
  const links = [...host.querySelectorAll('.sk-nav-item')];
  const active = links.find((link, index) => index > 0 && link.getAttribute('href') === paths[page]);
  if (active) active.setAttribute('aria-current', 'page');
  const details = host.querySelector('details');
  const layout = host.closest('.admin-layout');
  const toggle = document.createElement('button');
  toggle.className = 'sk-nav-toggle';
  toggle.type = 'button';
  details.id = 'admin-navigation-panel';
  toggle.setAttribute('aria-controls', details.id);
  host.prepend(toggle);
  let collapsed = false;
  const updateCollapse = () => {
    layout?.classList.toggle('nav-collapsed', desktop.matches && collapsed);
    toggle.textContent = collapsed ? '☰' : '‹ Collapse menu';
    toggle.setAttribute('aria-label', collapsed ? 'Open admin navigation' : 'Collapse admin navigation');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  };
  toggle.onclick = () => { collapsed = !collapsed; updateCollapse(); };
  const logout = host.querySelector('.sk-nav-stack > form');
  const placeLogout = () => {
    const target = desktop.matches || details.open
      ? host.querySelector('.sk-nav-stack') : host.querySelector('.sk-nav-mobile-actions');
    target.append(logout);
  };
  const desktop = matchMedia('(min-width: 1001px)');
  const applyViewport = () => { details.open = desktop.matches; placeLogout(); updateCollapse(); };
  details.addEventListener('toggle', placeLogout);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !desktop.matches) details.open = false; });
  document.addEventListener('click', e => { if (!desktop.matches && details.open && !host.contains(e.target)) details.open = false; });
  applyViewport();
  desktop.addEventListener('change', applyViewport);
})();
