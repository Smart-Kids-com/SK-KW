# Add to collection — local verification

Date: 2026-10-13. No production changes, commit, push, deployment or sales enablement.

The existing `collection_products` relation supports multiple memberships and has `UNIQUE(collection_id, product_id)` plus foreign keys. No migration is needed. The protected action appends only explicitly selected product IDs within a transaction, without deleting any other membership. Existing members are counted separately, missing products/collections abort the action, and repeated/concurrent requests cannot duplicate a relationship. Existing ordering is preserved; new members are appended. Product metadata, status, prices and inventory are not updated.

Products now exposes Add to collection in the selection bar. The dialog loads all administrative collections using cursor pagination, displays status/online-store visibility, searches their names, and confirms the captured selected count and collection name before Add. Application reports added and already-present counts, or the failure reason. A busy guard blocks repeated clicks while a request is pending; the database constraint also protects retries.

The affected test alone passed with 237 synthetic products and 132 collections in temporary store/auth databases. It covers one product, multiple products, previous membership, repeat and concurrent requests, preservation of another collection, invalid/missing IDs, unauthenticated rejection, and unchanged price/status/inventory snapshots. Existing collection administration endpoints show all added members; anonymous endpoints expose only active products in active online-store collections and return 404 for unpublished/offline collections.

Actual isolated Chrome verification covers all collection choices beyond the first page, search, confirmation and repeated-click result, the existing collection-edit page and anonymous collection storefront. Existing unrelated Products/Theme suites were not repeated. Physical devices and production were not tested. External traffic, email and Meta were blocked.

Running disposable demo: http://127.0.0.1:4810/admin?next=/products-admin . Synthetic login helper: http://127.0.0.1:4811/ . Existing demos remain separate. Sales are paused. Restart a fresh demo with Node 24: `node scripts/security-demo.js --products --collections --port 4810`. Data lasts only while the temporary demo runs.

Focused test: `node --test --test-name-pattern="Add to collection" tests/products-list.test.js`.

## Dialog appearance follow-up

The dialog now has a 720px maximum width and a responsive maximum height of 85dvh (620px on taller displays), shrinking to its contents for short filtered lists. Header/search and footer stay outside the scrolling list; background scrolling is locked while open and unlocked on native close/Cancel/Escape. Full-width search includes an icon and a matched/total count. Compact rows have an adjacent radio/name, status at the opposite edge, hover/selected/focus styling, full-row selection and keyboard navigation. The footer retains selected count/name, Cancel, Add to collection and the persistent result. Created/Updated show their date portion with the unchanged complete timestamp in the hover title; sort/API values are unchanged.

Only the affected dialog Chrome case was run for this follow-up, using temporary databases and 132 groups. It passed scroll/header geometry, row and keyboard selection, full-list search, disabled/add/result/cancel, abbreviated timestamp tooltip and fixed controls on 390px screens at 640px and 400px heights. Screenshots were reviewed; the older membership/backend tests were not repeated. Backend membership implementation is unchanged. The existing demo at port 4810 serves these updated static files without restarting or resetting its data.

Focused follow-up: `node --test --test-name-pattern="Collection dialog appearance" tests/products-list.test.js`.
