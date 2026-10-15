# Orders administration: local implementation and verification

Date: 2026-10-13 (Asia/Kuwait). Local work only; no production/operational database, commit, push, deployment, real mail/Meta or sales enablement.

## Preserved and corrected

Existing administration navigation and order-detail URLs remain. Details retain customer/address/item editing, manual payment, fulfillment annotations, return/restock tools, invoice versions, duplicate-send protection and legacy invoice review. Invoice services and fingerprints were not changed or retested without a reason. Products, collection membership and Theme implementation/drafts were not changed.

The old archive implementation changed execution to cancelled and therefore released reservations. Archive/unarchive now update the existing notes metadata flag only; payment, execution and inventory remain intact. Single-order and legacy bulk URLs share this implementation. Legacy bulk handlers are registered before `/:id/action` so `bulk` is not mistaken for an order ID. Legacy bulk requests are bounded to 100 IDs; large operations use the new job API. Old archived/cancelled records are not silently resurrected or re-reserved when unarchived; they remain cancelled and need a separate operational decision.

Fulfillment stores `shipped_at` without overwriting an existing timestamp on retry. New batch execution refuses cancelled/terminal orders returning to an unfulfilled state and uses the existing inventory triggers. Cancelling releases outstanding reservations once; fulfilled goods require the existing explicit restock operation. Cancellation and return annotations are not financial refunds.

## Interface and scopes

English/LTR compact table, Arabic names/notes with automatic text direction, three-decimal KWD from persisted totals, and independent payment/execution badges. Items distinguish quantity sum (pieces) from distinct product IDs (types). Required delivery-method cells say Not recorded; actual destination, tags, return flag, shipping fee, notes, email and phone remain optional columns. No invented Channels or delivery/carrier status.

Search by order/customer/email/phone, date/payment/execution/archive/tag filtering, sorting and counted pagination operate on the full server result. Page item counts use one grouped query. Existing All, Payment pending, Open, Cancelled and Today views, clear/refresh, Ctrl/Cmd+K search, open-first and page printing remain available. Columns support visibility, drag/move ordering, reset, sorting and Hide archived. Preferences are browser-local because authentication currently provides a shared admin scope without a stable named user identity; no global store preference is overwritten.

Individual/page selection can persist across pages. Changing search/filters explicitly clears it. All matching/store selection captures the criteria and maximum existing ID, builds its server-side ID set in chunks of at most 500, then freezes the final set/count. Concurrent data changes during building can adjust that final count; the final action review confirms it before writing. New orders after the cutoff are excluded. Show all selected, Unselect all and explicit whole-store/outside-filter confirmation are supported. Selection IDs are random, session-owned and expire after one hour.

Action jobs process at most 25 orders per step, persist per-order receipts and provide completed/skipped/failed counts and up to 50 result details. Same-job retries/concurrent steps do not repeat an order action. The browser can resume the current job after a network error; reload does not reconstruct an active job UI. Snapshot checkboxes are fixed; clear the snapshot to return to individual selection. Archive/unarchive, cancellation, tags, existing execution states, manual payment record, explicit restock/returned flags and internal fulfillment request/location annotations are available. The latter are labelled internal notes, not warehouse integration.

Print uses stored order/item snapshots in batches of at most 100, with a Next batch link. It sends no email and needs no app. Existing detail-page printing remains. Export explicitly chooses selected, filtered or whole store, reads 500 rows per chunk with response backpressure and uses a native browser download rather than constructing a whole-catalog JavaScript array/blob. CSV retains Arabic, escapes cells and guards spreadsheet formulas.

Admin Create order uses the existing pricing/discount/shipping/validation/reservation/storage and customer-sync functions, requires a create-attempt key and replays an existing attempt. It sends no email or Meta and does not open storefront checkout. The UI supports customer fields, notes, discount and searched catalog items/quantities; same-address billing is the default. Existing detail tools handle later edits.

## Summary definitions and limits

Default last 30 creation days, selectable 1–366 days, inclusive start/end calendar days in Asia/Kuwait. Prior comparison is the immediately preceding equal-length creation cohort.

- Orders: orders created in the period, including cancelled.
- Items ordered: summed quantities for that creation cohort, including cancelled orders.
- Orders fulfilled: current shipped/completed state of that creation cohort. It is not a count of deliveries or a fulfillment-event count during the period.
- Order to fulfillment time: mean creation-to-recorded `shipped_at` hours, only when every currently fulfilled order in the cohort has a valid timestamp. Otherwise Unavailable. Historical overwritten timestamps cannot be reconstructed; this is explicitly labelled recorded time, not guaranteed first fulfillment or delivery time.
- Sales reversals: Unavailable; no financial refund/reversal ledger exists. Cancellation is not counted as a refund.
- Orders delivered: Unavailable; completed is not evidence of a distinct delivery event.

Orders/items/fulfilled comparisons and mini charts use actual server aggregates grouped by Kuwait creation day. Missing time samples/no fulfilled orders remain Unavailable, not zero. Capture payments needs a connected provider. On hold needs an approved execution/inventory policy. Delivered/shipping status needs a distinct recording model or integration. Refund/reversal metrics need financial event data. These are not offered as implemented functions.

## Additive migration and verification

`db/orders-admin-migration.js` creates four private selection/job/receipt tables plus expiry/date-expression/payment indexes. No existing order/product balance or status is rewritten. The migration was applied only to temporary fixtures/demo; it must be explicitly reviewed/applied before a future deployment. No opening inventory settlement or previous production migration was repeated.

All five new test cases passed across focused runs: full search/sorting/counts/factual summary; scopes/jobs/tags/archive/export/print; priced admin creation and concurrent cancel/fulfill safety; actual Chrome UI; and selection larger than 500 with 25-order steps, session ownership/Origin guards and valid empty summaries. Later changes were checked only in affected cases. Existing Products/Theme/security/invoice suites were not rerun. Order creation deliberately reserves inventory in the temporary database; archive and repeated cancellation/fulfillment checks verified the exact expected balance changes rather than resetting balances.

Chrome covers columns/reload, selection across pages and whole store, action review/progress, print/export API paths, admin creation and 390px mobile containment. Screenshots were reviewed. It uses synthetic store/auth data and blocks external transports. Physical phones, real providers, production and every legacy detail option were not manually retested.

## Trial

http://127.0.0.1:4910/admin?next=/orders-admin.html — helper http://127.0.0.1:4911/ . Separate temporary demo with 132 orders, 237 products and 132 collections; earlier demos/drafts are preserved separately. Sales are paused. Demo data survives reload while running and is discarded when stopped.

Start with Node 24: `node scripts/security-demo.js --orders --products --collections --port 4910`. Focused test runner: `node scripts/test-security.js --orders-list`.
