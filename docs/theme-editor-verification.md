# Visual theme editor — local verification

Verified on 2026-10-11 with Node 24.21.0 and headless Chrome, using temporary file-based store/auth databases and synthetic credentials/catalog data. No production environment files, databases, mail, Meta, push or deployment were used. Local demo sales are paused.

## Implemented

- Authenticated editor at `/theme-admin`, connected to the actual storefront iframe, selectable element tree and inspector. Existing HTML/CSS/images and legacy settings remain the default; empty overrides preserve them.
- All 14 existing storefront templates, shared header/footer content and sections, template-specific overrides, desktop/mobile styles, resource selection for product/collection previews.
- Nested section/container/text/image/button/banner/slider/product/collection blocks; copy, delete, hide, sibling reordering with drag/touch and buttons; undo/redo. Existing safe DOM content can be copied as a static section. Forms, prices, quantities and totals cannot become editable text or static copies.
- Validated typography, colors/gradients, layout, dimensions, spacing, borders, shadows, image fitting and motion. Blank fields inherit current values; reset removes overrides. Motion honors reduced-motion preferences.
- Image library and PNG/JPEG/WebP upload (2 MiB each), stored in the shared database; original repository assets remain intact.
- Draft persistence with optimistic revision checks; separate publication of the saved draft; history restoration affects draft only. Preview blocks storefront writes and isolates cart/order browser storage.

## Passed checks

Three focused tests passed, including the real Chrome scenario:

1. Authentication, save/reload persistence, conflicting save rejection, draft/public separation, explicit local publish and history restoration.
2. Rejection of unsafe script URLs, injected CSS and unsupported uploads; persistent image byte round-trip, protected APIs, same-origin preview framing and continued admin frame denial.
3. Click-to-select/content editing, different desktop/mobile font values, save/reload, desktop drag and CDP touch drag, undo/redo, upload via browser file input, nested addition, styled-element hiding, copy/delete, static copy, product selection/collection source, shared elements and all 14 templates. Desktop/mobile screenshots reviewed; preview canvas has no horizontal overflow. Orders, prices and inventory rows matched before/after; no external effects were recorded.

Repeat only when relevant: `npm run test:theme` (Node 24 and installed Chrome/Edge required). Start an isolated session: `npm run demo:theme`.

## Limits and remaining rollout work

- Phone verification used Chrome viewport/touch emulation, not a physical device. No live provider or production behavior was tested.
- Upload persistence was verified in the temporary database across requests and page reloads, not through an actual Vercel redeployment. The local demo database is disposable when stopped.
- Original DOM copying produces a static editable representation, not a clone of its application event handlers. Live catalog blocks use catalog data. Reordering is within the same parent. Styling uses validated choices rather than arbitrary executable HTML/CSS.
- Asset listing currently shows up to 800 repository images and the latest 200 uploaded images; each document supports up to 600 blocks, six nested levels and 24 catalog entries per block. History UI shows the latest 50 versions; older records remain stored.
- Before any future production use, review/apply the additive `db/theme-editor-migration.js` explicitly: `theme_editor_documents`, `theme_editor_history`, `theme_editor_media`. No inventory settlement or old migrations are required by this feature. Production rollout, real-device acceptance and hosted image checks remain separate, unauthorized work.
- This completes the local theme-editor implementation and focused verification, not certification of the entire backend.

Running demo: `http://127.0.0.1:4510/admin?next=/theme-admin`. Synthetic login instructions/OTP: `http://127.0.0.1:4511/`. Production credentials must not be used here.
