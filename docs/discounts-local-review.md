# Discounts — local implementation and verification (2026-10-22, Kuwait)

Scope: local only. No production connection, schema change, order, inventory adjustment, Meta dispatch, commit, push or deployment.

## Previously available
- Fixed amount and percentage discount codes; enabled/disabled; minimum order subtotal; start/end; total usage cap; notes; administration CRUD and statistics.
- Server checkout prices from products, original shipping threshold based on subtotal before discounts, integer-fils rounding, transactional coupon reservation with order/items, checkout idempotency and inventory reservation.
- Code normalization trims outer whitespace and uppercases; internal whitespace remains part of the code.

## Added / corrected
- English/LTR administration using Products styling; complete server search (code/title/notes), status/method/type filters, deterministic sorting, pagination and browser-only saved column visibility/order.
- Editor: create/edit, duplicate as Draft with usage reset for the new record only, disable/enable, archive/restore. Preserve notes, minimum, dates and limits.
- Automatic discounts and free shipping; whole order, selected products or collections; minimum eligible-unit quantity. Manual and automated collection rules/exclusions are evaluated on the server against cart products.
- Kuwait datetime input explicitly converts UTC+03:00 to persisted UTC; display uses Asia/Kuwait.
- One authoritative calculator for preview and checkout. The preview now requires product IDs and quantities, ignoring client subtotal/prices/discount/total. This deliberately replaces the insecure subtotal-only preview contract.
- Only one discount per order. Explicit code replaces automatic discounts. Otherwise maximum eligible automatic savings, ties by lowest ID. Automatic zero-benefit discounts are skipped. This is a new explicit policy for the new automatic feature; old code behavior remains.
- Product/collection discount caps at eligible merchandise; fixed order discounts cannot remove shipping. Free shipping retains original shipping in its line and shows an equal discount, keeping the total and discount identical across Cart, Checkout, order, thank-you, email and invoice.
- Save discount title as an order snapshot. Renaming a discount cannot rename an old order. Order detail desktop/mobile shows the saved amount/label. Invoice fingerprint includes a nonempty new label, preserving the previous fingerprint for legacy orders without a label.
- Usage consumed atomically with order/items. Current limit/time/enabled status and pricing-rule snapshot checked at commit. Repeat checkout keys retain existing single-order behavior. Cancellation does not release a discount use (existing behavior).
- Usage count is now read-only in the editor, because manually resetting it bypasses limits/audit history. Permanent deletion remains available for unused, unreferenced codes only; used records must be archived.

## Not supported
- Verified customer accounts / customer selection / per-customer caps. Current customers are guest order snapshots; entered email/phone is not authenticated identity. The server rejects these restriction requests rather than implying enforcement.
- Discount stacking, buy-X-get-Y, customer segments and carrier-specific shipping discounts; none existed in this model. No invented functionality exposed.
- Actual external inbox rendering/delivery or production browser purchase; intentionally not tested in this local task.

## Explicit future migration (not run on production)
`db/discounts-editor-migration.js` exports `migrateDiscounts(db)`.
- Add discount_codes: title, method (default code), archived (default 0), rules_json (default {}).
- Add orders.discount_label (default empty; no historical row rewriting).
- Unique index on UPPER(TRIM(code)); method/archived/is_active index.
- Detect normalized collisions before the transaction; stop without merging/deleting records. All DDL applies in a write transaction; repeat migration adds no columns.
- Existing codes retain their values, usage, timestamps, enabled status, history and whole-order scope. No inventory reconciliation or prior migration repeated in production.
- Before any future deployment: backup confirmed store, inspect collision preflight, apply this additive migration, deploy code; retain previous release. Application startup does not run this migration.

## Verification evidence
- `tests/discounts.test.js`: 6 passing integration/browser cases. Includes invalid/draft/archived/scheduled/expired codes, Kuwait dates, minimum spend/quantity, product/collection scope, fixed cap, free shipping, automatic winner/tie policy, 106 result pagination, cloning and lifecycle, unauthorized access, concurrent last use, pre-priced race, changed-rule rollback, retry, legacy normalized code, persisted amount/title, escaped email/invoice, Cart/Checkout/Thank-you/admin/detail rendering at 1280/390/320 and saved columns.
- Affected existing `tests/order-pricing.test.js`: 19 passed, 1 legacy optional browser check skipped (new focused browser check ran). External mail/Meta attempts were blocked by the existing test guards; none sent.
- Three affected invoice regression cases passed: retry protection, changed saved-order version, and legacy review.
- `git diff --check` passes.

Demo: `node scripts/security-demo.js --discounts --port 5510` with Node 24. Loopback app 5510, synthetic login helper 5511. Temporary store/auth databases, synthetic fixtures, CSP/network isolation, fake mail/CAPI. `/discounts-demo-cart` prepares a local cart. Example codes WELCOME, SHIP, PRODUCT (quantity >=2), COLLECTION; AUTO gives 0.500 KWD when no code is entered. No environment files are loaded.

Release follow-up: page-specific scroll override removes the inherited table overscroll containment. Trusted wheel, precise-wheel trackpad emulation and touch gestures verified over table/filters/content at 1280 and 390; dialog form scrolling and Escape/button/programmatic close restore root scrolling. Current Discounts has a top navigation, no collapsible sidebar.
