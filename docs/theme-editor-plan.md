# Visual theme editor — local implementation

The editor operates on real storefront pages, with the existing HTML, CSS, images and legacy theme settings as its baseline. Empty overrides must leave that baseline intact. Catalog prices, quantities, payment values and form values are not editable content.

1. Add an explicit, additive editor migration: draft/published documents, optimistic revisions, immutable history and image assets. No startup migration and no production application. Preserve existing theme tables.
2. Bridge an authenticated same-origin iframe to a section/element tree and inspector. Keep published state public but draft state protected. Block shopping/navigation while selecting in the preview. Attach the renderer to every storefront template.
3. Add shared header/footer overrides, page overrides, desktop/mobile styles, nested custom blocks, ordering, undo/redo, history restoration and a persistent image library. Save and publish are separate actions.
4. Verify locally against temporary store/auth databases and fake providers: preview selection and editing, persistence across reload, draft isolation, ordering, undo/redo, responsive overrides, asset persistence, publish/restore and authorization/validation.

Uploaded PNG/JPEG/WebP files are stored in the configured shared database, not the ephemeral Vercel filesystem. Original repository images remain untouched. The initial upload ceiling is 2 MiB per file; large catalogs may later use a dedicated object store. The editor migration must be reviewed and applied explicitly before any future deployment. This task does not authorize deployment, push or reopening sales.
