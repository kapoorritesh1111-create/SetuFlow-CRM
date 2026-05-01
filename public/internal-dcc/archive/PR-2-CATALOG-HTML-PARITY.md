# PR-2 — Catalog HTML Parity + Quote-Readiness Workflow

Status: Completed in this build
Date: 2026-04-27
Readiness: 88%

## Completed
- Read `public/reference-html/setuflow-catalog-redesign.html` and matched the Catalog workspace rhythm.
- `/products?mode=buyers` now uses reference-style view tabs: Products, Pricing, Spreadsheet.
- Filter bar uses compact category/pricing/gap/status/quote filters with a pricing gaps CTA.
- Added six-stat strip: Products, Variants, Priced, Quote-ready, Gaps, Inactive.
- Product table now groups rows by category and keeps Ex-Factory, FOB, CIF visible.
- Gap badges show Ready / Partial / Missing states from existing quote-readiness logic.
- Inline editable Ex-Factory and FOB unit baselines persist through the existing product update API.
- Quick quote link is gated to active + quoteable + priced variants.
- Product detail is one drawer with Overview, Pricing, Variants, Trade attrs, History tabs.
- Preserved Add Product drawer and existing product/variant/pricing APIs.

## Remaining risk
- CIF is visible and included in the drawer/table, but existing update payloads do not expose a CIF write field, so CIF remains read-only in this PR to avoid schema/API changes.
- Full local dependency install was unavailable in the patch environment; Vercel should run the canonical `npm ci && npm run build` validation.

## Files changed
- `src/features/products/components/products-spreadsheet-page.tsx`
- `src/features/products/components/products-toolbar.tsx`
- `src/features/products/components/products-table.tsx`
- `src/features/products/components/product-detail-drawer.tsx`
- `public/internal-dcc/index.html`
- `public/internal-dcc/PR-2-CATALOG-HTML-PARITY.md`
