# Theme editor UX: local implementation and verification

Date: 2026-10-12. Local changes only; no production migration, deployment, push, or sales enablement.

## Implemented

- English, LTR Themes management and editor; Arabic RTL storefront preserved. Published theme, independently saved named duplicates, rename, preview, and explicit publication. History restores a draft rather than silently changing publication.
- Header / Template / Footer hierarchy, preview selection, grouped inspector, device preview, visibility, section/block actions, drag ordering, undo/redo, saved drafts and reload. Advanced DOM entries remain available separately.
- Searchable Add section dialog with actual renderer miniatures and structured starter blocks. Text, images, banners, slideshow, linked products/collections, product slideshow, video, collage, columns/rows, accordion, Page and WhatsApp. Blank custom pages can be created without clearing existing pages.
- Desktop/mobile image fallback and independent appearance/visibility. Shared component settings, heading/body typography, palettes, button hover, cards, brand/social links, search threshold, currency presentation and validated scoped custom CSS.
- Product slideshow uses catalog IDs and current API product data, with ordering, autoplay/loop, transitions, arrows, dots, overlay, button and title/price settings. Theme editing does not replace authoritative prices or inventory.
- Hosted MP4/WebM video with poster and native playback options. Image upload, thumbnails and replacement use persistent database-backed media, SHA-256 deduplication and a 2 MiB per-image limit. No paid storage service was added; base64 carries approximately 33% storage overhead. Video bytes are not stored in the database.

## Verification and limits

Four isolated tests passed for draft/publication separation, validation/authentication/media, independent theme library/history/CAS, and actual Chrome editing. Subsequent UI-only changes were checked by rerunning the affected Chrome case; the final run result is recorded in `theme-test-v2-browser-final.local`.

The Chrome flow covers management, selection, editing, section addition, desktop ordering, actual emulated-mobile touch ordering, undo/redo, device image/style/visibility overrides, saved reload, publication in the disposable database, a new blank page, and scoped CSS. Synthetic WebM playback was exercised. A temporary catalog name/image/price change appeared after reload and was restored. Final order and inventory rows matched their initial values. Mail, Meta and external traffic were blocked.

The previous baseline's 14-template checks were not repeated without a reason. The new UX flow concentrates on Home and the new custom page; it does not certify every new setting on every existing template. Physical phones, real externally hosted video providers and production hosting were not exercised.

Email signup and Contact form delivery still need backend integration. Blog, variant-pill systems and saved style presets are not implemented; no nonfunctional controls are presented as working. Video embedding/upload is limited to hosted MP4/WebM URLs. Custom CSS intentionally permits validated scoped rules rather than arbitrary CSS.

## Schema and local trial

The existing local editor migration retains documents, history and media. This phase adds `theme_editor_library`, `theme_editor_identity`, and `theme_id` on history, preserving previous rows as `current`. These changes were applied only to disposable test/demo databases. They require reviewed application before any future deployment; inventory settlement and prior production migrations were not rerun.

Running isolated trial: http://127.0.0.1:4610/admin?next=/theme-admin . Synthetic login helper: http://127.0.0.1:4611/ . Demo sales are paused. Data survives reload while the demo runs and is discarded when it stops. Use Node 24 with `node scripts/security-demo.js --theme --port 4610` to start a fresh instance after stopping the existing one.

Current storefront defaults, original images, shared design and protected order/authentication flows remain the baseline until an explicit theme change. All project changes remain local and uncommitted.

## Follow-up: sidebar and theme-card polish

Full section captions and wrapping row names replace truncation. Move actions share the existing secondary-actions menu instead of separate arrow icons; existing Blocks/Advanced/history folding is retained. Header blocks use Logo/Search/Cart/Menu names, footer social entries use platform names, and native slideshow media/cart entries include current product titles. The current native slideshow builds one DOM slide per product without motion clones; known clone markers are excluded from the editable scan.

Published theme thumbnails scale their full 1280 × 780 viewport to the actual card width, with matching container height. Native slideshow Button text now reads the real current cart-label default and is explicitly named Add to cart button text. Newly added product slideshow links are named Product link button text. Editing native text retains the original data-add-id binding and does not overwrite disabled out-of-stock labels.

The focused Chrome scenario passed: thumbnail geometry, semantic names, full-name wrapping, one actions menu, product-aware block names, simulated motion-clone exclusion, and native button text/default/binding. Order/inventory rows remained unchanged in the temporary database. Existing manually confirmed Title/Autoplay/Arrow size persistence and folding were not reimplemented or retested. Remaining manual tests are deferred; no real checkout or production interactions were performed.
