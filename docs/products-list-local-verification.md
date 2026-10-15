# Products list: local implementation and verification

Date: 2026-10-12. Local, uncommitted changes only. No operational/production database was used, and no push, deployment, settlement, or sales enablement was performed.

## Review and implementation

The current product router, product table and inventory service were reviewed before implementation. Existing fields already include product name, SKU, price/sale price, category, product type, vendor, images, status and created/updated timestamps. Category remains separate from product type. No additional product fields or database migration are required. The feature requires the already established inventory columns (`on_hand`, `committed`, `unavailable`); it does not add or reconcile them during runtime.

`products-admin.html` now provides English/LTR controls and intact Arabic names in a compact white table. Original Add/Edit URLs are preserved. Status tabs, literal name/SKU search, inventory/category/type/vendor filters, allowed sort columns and directions operate on the entire server result before pagination. Counts and page ranges come from SQL. Page images use one grouped lookup. New administrative endpoints under `/api/products/admin/` are protected; existing storefront product listing remains unchanged.

Columns can be shown/hidden and reordered using drag handles or accessible move controls. SKU and Price are available. Preferences are stored in a separate browser-local key, not product rows. The Product column remains visible. Mobile horizontal scrolling is confined to the table. Loading, empty results, failures and retry are explicit.

Selection includes only explicitly checked IDs, with a current-page checkbox and selected count. Bulk status/archiving returns requested/updated counts and individual missing-product errors. No permanent delete action is provided. Export explicitly chooses selected, all matching filters across pages, or all products including archived. It reads rows in server chunks rather than loading the catalog for client-side search. CSV cells are escaped and formula-leading strings are prefixed for spreadsheet safety.

CSV import supports the existing product metadata fields, with ID/SKU/slug matching, quoted/multiline CSV parsing, duplicate/conflict/value validation and a mandatory preview. Limits: 500 rows and 2 MiB per file. Application revalidates within a transaction, rejects a changed metadata snapshot, and rolls back on failure. Read-only stock/reservation/timestamp columns from exports are ignored and explicitly reported. Existing balances/reservations are never written by import. New products default to Draft and zero inventory. Updated image URLs also update the existing primary image row when appropriate.

The More actions menu offers working Refresh, Reset view preferences and Download CSV template actions. No Channels/Catalogs columns are shown because there is no corresponding actual system.

## Analytics not fabricated

- Average sell-through rate needs dated receipt/opening inventory quantities for a defined period; current balances are insufficient.
- Days of inventory remaining needs a defined demand window and dependable sale/fulfillment timing. The current fulfillment ledger has states without event timestamps; order creation time is not delivery time.
- Shopify-equivalent ABC product analysis needs an agreed revenue window/basis and reliable net product revenue covering discounts, returns and historical products. The current paid flag and order lines alone do not establish that full definition.

These three metrics are left unsupported rather than displaying demo numbers or an unlabelled approximation. Their future implementation requires data coverage and calculation definitions to be agreed.

## Verification

Four focused tests passed with 237 varied synthetic products in a disposable store/auth database. API coverage includes search beyond the first 100 products, all supported filters, stable sorting/counts/pagination, computed available inventory despite a stale stock cache, unauthenticated rejection, partial bulk results, all-page and filtered/selected exports, and CSV duplicates/conflicts/stale-preview rejection/zero-stock creation. Existing inventory snapshots were unchanged by bulk/import operations.

An actual isolated Chrome flow checked name links, pagination/search/filters, column drag and reload persistence, current-page selection/status change, CSV file preview/application and duplicate rejection. A follow-up ran only affected CSV/browser cases to add cross-origin write rejection, empty/error/retry states, Price visibility, real export-response/download handling and mobile horizontal scrolling. Both follow-up cases passed. External traffic/mail/Meta were blocked. Screenshots were reviewed for desktop and emulated mobile; physical devices, production, real external images and real operational order flows were not tested. Existing successful Theme and other backend suites were not rerun.

## Trial

Running separate temporary demo: http://127.0.0.1:4710/admin?next=/products-admin . Synthetic login helper: http://127.0.0.1:4711/ . Sales are paused. The previous Theme demo/drafts remain separate. Demo data survives reload while its process is running and is discarded when it stops.

Restart a fresh instance with Node 24: `node scripts/security-demo.js --products --port 4710`. Run focused checks with `node --test tests/products-list.test.js`, or `node scripts/test-security.js --products`. Test output and screenshots are local evidence, not production data.
