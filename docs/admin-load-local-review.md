# Admin loading correction — local review, 2026-10-22

This follow-up is local only. Production remains on 0dd9a9e; no new deployment, push, production migration, order, inventory change, discount change, mail or Meta dispatch was performed.

## Reproduced failures
- Installed @libsql/client 0.5.6 uses @libsql/isomorphic-fetch 0.1.12 on Node. Its Response constructor connects the body to Readable.toWeb, then json()/arrayBuffer() consume the original Node stream. The extra reader/backpressure causes larger response consumption to stall.
- Live read-only benchmark of identical SQL: one product returned in 799ms (3,808 bytes); 25 rows (64,928 bytes) failed the bounded 10s read. Merely switching libsql URL to HTTPS had the same failure.
- With the native Fetch adapter, the same 25-row projection returned in 233ms. No timeout/retry increase and no dependency upgrade.
- Orders had a separate remote-only failure: SDK Row named properties are read-only; notes decoration threw `Cannot assign to read only property 'notes'`. Summary also normalizes existing aggregate fields. Local file rows did not reveal that mismatch.

## Fix
- db/turso-manager.js supplies db/libsql-fetch.js for remote connections, preserving URL, token, SDK batch and transaction behavior; local file connections keep their original client path.
- get/all return ordinary mutable records. Orders decorates copies, including when given a read-only SDK adapter.
- Product grid fetches only its displayed/edit-link fields; descriptions/SEO remain in edit and CSV contracts. Thumbnail lookup returns only the first indexed image per page product.
- Existing indexes confirmed in EXPLAIN QUERY PLAN: idx_products_created_at and idx_orders_admin_created_jd. No new migration is required.
- Failed lists show unavailable rather than a misleading zero result count.
- Products, Discounts, Themes list and visual Theme editor now use the same navigation component/images/collapse/mobile behavior as Dashboard, Orders, Collections, Inventory and Customers; current page is highlighted.

## Actual-data evidence
- Protected loopback replica uses an existing verified snapshot with 44 products, 4 orders, 5 customers, 3 collections and 4 discounts. Normal password + OTP authentication uses a separate synthetic auth database.
- Replica SQLite query_only is ON. HTTP writes are blocked, external traffic/mail/Meta are blocked, and all store table content hashes match before/after review. Source snapshot is never modified.
- Nine authenticated API checks verify saved data, counts and selected period, not just status/health. October summary correctly contains 1 order, while the complete orders list contains 4 across dates.
- Eighteen rendered browser checks cover the eight requested pages plus the visual Theme editor at 1280 and 390. Active navigation, desktop collapse/reopen and mobile open/Escape close verified; page data rendered in 150–1814ms in the final parallel test run.
- Separate live-store read-only transaction with the corrected local code: Products 258ms (25 rows, total 44, 17,917 bytes), Orders 163ms (4 rows), Orders summary 425ms. These are local-client-to-Turso readings, not proof of an undeployed Production API fix.

## Regression checks
- Native fetch bridge: large multi-chunk responses, method/headers/binary body/abort, mutable get/all records and immutable remote Orders rows.
- Products suite, Orders suite and Discounts suite passed on synthetic temporary DBs. Discounts scroll verified with the shared sidebar expanded/collapsed.
- Previously untracked checkout scripts were reviewed in full and retained as useful regression tooling: checkout-review-demo is an isolated fixture/mail-capture runner, check-checkout-review-browser is invoked by tests/checkout-review.test.js. 71 viewport/scenario checks and captured fake mail passed. Neither file is deployed; scripts/tests remain excluded by .vercelignore.
- No secret values, SQLite files or snapshot data are part of the commit. Operational measurements and artifacts remain in ignored .local files.

## Reproduce / review
Run Node 24: `node --test tests/libsql-fetch.test.js`.
For a protected real-data replica: `node scripts/admin-readonly-review.js --snapshot <local-backup.db> --port 5610`.
For the authenticated all-page test, set SK_REVIEW_SNAPSHOT to that local backup and run `node --test tests/admin-readonly-review.test.js` (it explicitly skips without the opt-in path).
Local review: http://127.0.0.1:5610/admin?next=/products-admin ; synthetic login helper: http://127.0.0.1:5611/.
