# Fix Report — Catalog & Price List Workflow (S34-CATALOG-038→046)

**Pass goal:** make Price Lists a natural extension of `/products` (single source of truth) — one canonical pricing source, no duplicate catalog universe, discoverable navigation.

## Root cause

Pricing was read from two unsynchronised places. The Products workspace derives Ex-Factory / FOB from the canonical engine (`product_pricing_rules` + `product_prices`), but the Catalog Hub, the Price-List picker, the readiness badge and the Share Wizard read the flat `products.fob_price / exw_price / cif_price` columns — a stale, mixed-unit snapshot. Result: priced products showed "Missing Price" (Catalog Hub, Share Wizard), the Price-List editor left Base Unit Price empty, and one product carried a per-case figure (Banana Chips `fob_price = 110`) where the app expects per-unit (`1.75`).

## Changes

**New — canonical resolver**
- `src/lib/catalog-share/pricing-resolver.ts` — `resolveProductPricing()` returns per-product EXW/FOB (per-unit USD, from rules; CIF/DDP pass through flat columns) so every catalog/price-list surface matches the Products page.

**Repointed to the resolver (fixes cascade)**
- `src/app/api/price-lists/products/route.ts` — overlays canonical pricing onto product rows. This single endpoint feeds the Price-List picker, the Catalog Hub Products tab, the readiness badge and the Share Wizard, so all are fixed at once. (S34-CATALOG-039/040/041)

**Navigation / IA**
- `src/features/products/components/products-spreadsheet-page.tsx` — added **Price Lists** and **Buyer shares** actions to the Products header.
- `src/lib/routes/manifest.json` — added a **Price Lists** left-nav entry beside Catalog (Products).
- `src/app/(app)/price-lists/price-list-manager.tsx` — Products breadcrumb + FX-aware auto-fill.
- `src/app/(app)/catalog/catalog-hub.tsx` — demoted to a **Buyer Shares** command center; removed the duplicate Products editor tab; default tab is Shared Links; products are managed only on `/products`. (S34-CATALOG-038/043)

**Data quality**
- `src/app/api/price-lists/options/route.ts` — removed `leads.product_type` (a category) from buyer segments; curated B2B segment defaults + existing values + `lead_type`; now also returns `fxRates`. (S34-CATALOG-042)
- FX: market-average conversion into the list currency on auto-fill (passthrough when no rate). (S34-CATALOG-045)

**Mitigation migration**
- `supabase/migrations/s34_catalog_039_pricing_source_backfill.sql` — backfills flat columns from canonical per-unit rules so the data is self-consistent (Banana Chips 110→1.45; ~19 NULL products populated). **Applied to live DB.** Active priced products: 17 → 22 of 40 (remaining 18 are true pricing gaps). (S34-CATALOG-046)

## Verification

- All edited TS/TSX transpile clean (esbuild).
- Route/manifest/repo-alignment contract tests pass (2 unrelated pre-existing baseline failures in `globals.css` and the profile vCard editor — untouched here).
- Live DB dry-run + post-backfill counts confirmed.

## Issue tracker (live Supabase)

Resolved: **S34-CATALOG-038, -039, -040, -041, -042, -043**.
In Review (follow-ups): **-044** (Products-summary KPI reconciliation), **-045** (seed `exchange_rates` to activate FX), **-046** (retire flat price columns once all readers use the resolver). New issues -045/-046 created.

## Prototype

`public/internal/products-price-list-workflow.html` reflects the corrected workflow and replaces the conceptual role of `catalog-price-list-qa.html`.
