'use strict';
// One authenticated, bounded search component for every administration page.
(() => {
  if (document.querySelector('[data-global-admin-search]')) return;
  const root = document.createElement('section');
  root.dataset.globalAdminSearch = '';
  root.className = 'sk-admin-search';
  root.innerHTML = '<label>Search administration<input type="search" placeholder="Search products, orders, collections, customers" aria-label="Search administration" autocomplete="off" aria-controls="admin-search-results" aria-expanded="false"></label><div id="admin-search-results" class="sk-admin-search-results" hidden><p role="status" aria-live="polite"></p><div></div></div>';
  const parent = document.querySelector('.admin-page-content');
  if (!parent) return;
  parent.prepend(root);
  // Remove only the old non-functional placeholder search, leaving page filters intact.
  for (const input of parent.querySelectorAll('.top-search,.desktop-search input')) {
    if (!input.id && !input.oninput) input.closest('.search-wrap,.desktop-search')?.remove();
  }
  const input = root.querySelector('input'), panel = root.querySelector('.sk-admin-search-results');
  const status = panel.querySelector('p'), results = panel.querySelector('div');
  let timer, controller, sequence = 0;
  const close = () => { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  async function search() {
    controller?.abort();
    const current = ++sequence, q = input.value.trim();
    results.replaceChildren();
    if (q.length < 2) { close(); return; }
    panel.hidden = false; input.setAttribute('aria-expanded', 'true');
    status.textContent = 'Searching…';
    controller = new AbortController();
    try {
      const response = await fetch('/api/admin-dashboard/global-search?q=' + encodeURIComponent(q), {signal:controller.signal,cache:'no-store'});
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.error || 'Search unavailable');
      if (current !== sequence) return;
      let count = 0;
      for (const [group, rows] of Object.entries(json.data)) {
        if (!rows.length) continue;
        const heading = document.createElement('h3'); heading.textContent = group;
        results.append(heading);
        for (const row of rows) {
          const link = document.createElement('a'); link.href = row.url;
          link.textContent = row.label; link.dir = 'auto'; results.append(link); count++;
        }
      }
      status.textContent = count ? count + ' results · up to 5 per type' : 'No matching results';
    } catch (error) {
      if (error.name !== 'AbortError' && current === sequence) status.textContent = 'Search failed. Please try again.';
    }
  }
  input.maxLength = 80;
  input.addEventListener('input', () => { clearTimeout(timer); controller?.abort(); sequence++; timer = setTimeout(search,250); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { controller?.abort(); clearTimeout(timer); sequence++; close(); input.focus(); }
    if (['ArrowDown','ArrowUp'].includes(event.key)) {
      const links = [...results.querySelectorAll('a')]; if (!links.length) return;
      event.preventDefault(); const index = links.indexOf(document.activeElement);
      links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length].focus();
    }
  });
  document.addEventListener('click', event => { if (!root.contains(event.target)) close(); });
})();
