# Orders appearance — local verification, 2026-10-14

Presentation follow-up to the existing Orders implementation. No new database schema, migration, pricing, stock, reservation, invoice or operation implementation was introduced in this round. Existing local Products, Collections and Theme work is retained.

- Shared navigation is 260px on desktop, collapsible/reopenable; original image assets and links retained with proportional image rendering. Small screens use an overlay menu, dismissible by its control, Escape or an outside click. Browser navigation checks covered inventory, collections, customers, discounts, redirects, abandoned checkouts, Home and Theme where the shared host exists.
- Compact metrics preserve server calculations/Kuwait dates and actual daily series. Previous period wording; definitions and technical unavailable reasons are accessible disclosure controls. Unavailable payment capture, On hold and Delivered remain disabled.
- Search and advanced Filters are separated; active filters can be removed. API values are unchanged. Columns and view preference handlers retained.
- Compact selection bar uses plain counts and selection scope menu. Mark as and grouped More actions open the existing review dialog directly. All actions, tags, batching, receipts/retries and confirmation remain in place. Manual payment and returned-flag reviews explicitly explain no capture/refund respectively.
- Compact rows; customer cells have bounded width and a full-name tooltip, and existing order details retain the full name. Safe textContent rendering, Arabic names and three-decimal totals retained.

## Verification limits

Executed only the new `Orders appearance` browser test via `scripts/test-security.js --orders-list --orders-appearance`, on temporary isolated store/auth databases, with real external network/mail/Meta blocked. Passed desktop 1600px and emulated mobile 390px checks: navigation size/collapse, filters and chip removal, selecting two orders, direct manual-payment/Completed review and cancellation, details, shared navigation pages, action-menu viewport fit and literal XSS text with no injected image/script. No bulk action was applied in this appearance test. Successful prior operation suites were not rerun.

Security fixtures retain their synthetic HTML/XSS name. Screenshot fixtures and the new presentation demo replace only temporary order 1/2 display names with ordinary names after the unsafe-text assertion. No production customer data is touched.

Evidence: `orders-editor-evidence.local/appearance-full.png`, `appearance-selection.png`, `appearance-mobile.png`. New isolated review instance: `http://127.0.0.1:5010/admin?next=/orders-admin.html`; synthetic password/OTP helper: `http://127.0.0.1:5011/`. Earlier local demo is preserved. Sales remain paused. No commit, push, deployment or production write.

Physical-device/manual review remains outstanding. Existing absent delivery/refund/payment-provider capabilities remain absent; this round does not enable them or claim overall backend completion.

## Scroll and header-menu follow-up

Reproduced before fixing with real browser wheel input and repeated small pixel deltas: the horizontal `.table-scroll` inherited `overscroll-behavior: contain` for **both** axes, swallowing vertical scroll chaining despite having no vertical scroll range. Scrolling worked over the sidebar, but stopped over the table, both before and after Collapse menu. Shared mobile navigation also had a non-modal `body overflow:hidden` rule. The header More actions buttons were in normal flow and increased its height by 117px.

Fix: Orders overrides only the vertical table overscroll behavior to `auto`, preserving horizontal containment; removed navigation's background lock. Genuine dialogs alone lock html/body through `:modal`, naturally releasing on close/cancel. Backdrop dismissal checks both press and click outside dialog bounds. Header More actions now uses the existing absolute/fixed popup menu treatment and outside/Escape closure, keeping its three original handlers. No wheel/touchmove interception, smooth scrolling or operation changes were added.

Passed only `scripts/test-security.js --orders-list --orders-scroll` on fresh temporary store/auth databases. Verified upward/downward wheel (±120px) and simulated touchpad-style input (10 × ±8px) over main content, table and sidebar, expanded/collapsed; mobile sidebar propagation at both ends; PageDown/PageUp; actual touch swipes upward/downward; header menu mouse, keyboard and touch/outside/Escape; columns/export/create dialog background locking and restoration after button/Escape/backdrop closure; mobile touch background lock and touch-button closure/restoration. Header growth is now 0px. No operation applied, no invoice/stock/pricing suites repeated. A physical touchpad/device was not available; its pixel-delta stream and touch input were simulated through browser CDP.

The existing localhost 5010/5011 review instance serves the updated static files without restart or loss of demo changes. No commit, push, production mutation or deployment.
