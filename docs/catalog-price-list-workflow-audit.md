# Catalog & Price List Workflow — Audit, Corrected Workflow & Fix Plan

**Scope:** Make Price Lists a natural extension of `/products`, with Products as the single source of truth — no duplicate catalog universe, no broken pricing.
**Source of truth confirmed against:** repo `SetuFlow-CRM-main`, live Supabase (`sjzfzloggabsmcuxktnl`), Sprint 34 issue tracker (`S34-CATALOG-*`, all *In Review*), and the seven UI screenshots.

---

## 1. Audit & diagnosis

### 1a. The core defect — pricing lives in two unsynchronised places

| Surface | Reads pricing from | File |
|---|---|---|
| **Products page** (`/products`) | `product_pricing_rules` (`fob_usd`, `ex_factory_usd`, `*_per_unit`, `*_per_case`) + `product_prices`, via the canonical engine | `src/lib/queries/query-core.ts` |
| **Catalog Hub** (`/catalog`) | flat `products.fob_price / exw_price / cif_price` | `src/app/(app)/catalog/catalog-hub.tsx` → `/api/price-lists/products` |
| **Price List picker** (`/price-lists`) | flat `products.fob_price / exw_price / cif_price / ddp_price` | `src/app/api/price-lists/products/route.ts` |
| **Readiness badge ("Missing Price")** | flat columns only | `src/lib/catalog-share/types.ts` → `computeProductReadiness` |

The flat `products.*_price` columns are a stale, partially-populated snapshot. Live DB proof (org `3327b9a7…`):

- **40** active products; only **17** have flat price columns; **20** have real `product_pricing_rules`.
- **Banana Powder / Beetroot Chips / Beetroot Powder / Carrot Powder** — flat columns `NULL`, but `fob_usd` = 8.25 / 1.85 / 5.75 / 5.75. → Products page shows the FOB; Catalog Hub shows **"Missing Price"** (screenshot 2), Share Wizard warns "no price" (screenshot 7), Price-List editor leaves **Base Unit Price empty** (screenshot 6).
- **Banana Chips** — flat `fob_price = 110` while canonical per-unit FOB = **1.75 / 1.45**. The flat value isn't just stale, it's the wrong basis/unit (a per-case EXW figure). Sharing it would quote a buyer **~60× the correct price.**

This single divergence is the root cause behind screenshots 2, 6 and 7. → **S34-CATALOG-039 / -040 / -041 / -044.**

### 1b. Duplicate "catalog universe"

There are three overlapping product surfaces: `/products` (the real editor), `/catalog` "Catalog Hub" (Products + Price Lists + Shared Links + Analytics tabs), and `/price-lists`. The Catalog Hub **Products tab re-lists the same products** with a weaker, mis-priced view and its own KPI counts (40 vs the Products page's 37/47). The rail has a single **Catalog** entry pointing at `/catalog`, so users land in the duplicate rather than the source of truth. → **S34-CATALOG-038 / -043 / -044.**

### 1c. Navigation gaps

- `/price-lists` and `/catalog` are not reachable as tabs from `/products`; `/products` has only Products / Pricing view / Spreadsheet (screenshot 1).
- No breadcrumb path **Products → Price Lists → list detail**, and no clear "back to Products/Catalog".
- Price Lists is **not** a discoverable left-nav destination. → **S34-CATALOG-043.**

### 1d. Form/data-quality breaks

- **Polluted dropdown (screenshot 5):** the list's Market / Buyer-Segment selector is populated with **product categories** ("Vacuum-Cooked Chips", "Caradamom", "Chana"…). Market/segment must come from `markets`, lead/buyer data and existing lists. → **S34-CATALOG-042.**
- **Auto-fill is wired but pulls from the empty source.** `price-list-manager.tsx → applyProduct()` already calls `priceForIncoterm()` and fills MOQ/lead/notes — it just reads the flat columns, so for most products it fills nothing (screenshot 6). The logic is sound; only the data source is wrong. → **S34-CATALOG-040.**
- **FX:** `exchange_rates` table exists (`base_currency, quote_currency, rate, provider, effective_at`) but is **empty**, and nothing in the price-list path consumes it. "Market average FX" is currently unimplemented.

### 1e. What is already correct (keep)

- The `price_lists → price_list_items → price_list_tiers` schema is clean and correctly models **Price List → Products (one-way)**. `price_list_items` even carries `product_variant_id`, so variant-level pricing is supported.
- The Price List Manager UX (create slide-over, item editor, tier table, MOQ units) matches the intended flow. The data model does **not** need a rewrite — only the pricing source and the navigation/IA do.

---

## 2. Corrected end-to-end workflow (from `/products`)

1. **Start at `/products`** — the single entry point. Tabs: **Products · Price Lists · Buyer Shares** (mode toggle Products/Pricing/Spreadsheet stays on the Products tab). The left-rail **Catalog** item expands to Products / Price Lists / Buyer Shares.
2. **Products tab** lists every product with **canonical** Ex-Factory / FOB / CIF and a true readiness chip. "Missing Price" appears only when the product genuinely has no rule in any basis.
3. **Go to Price Lists** via the tab, the rail sub-item, or **+ Create Price List** (available from the Products toolbar and the Price Lists tab).
4. **Create a list:** name, currency, **pricing basis (incoterm)**, incoterm location, market/region, buyer segment (from markets/buyer data — never categories), validity, notes. Selecting **FOB** sets the auto-fill basis.
5. **Add products to the list:** search → pick. Each row **auto-fills from the canonical product pricing** for the chosen basis: unit price (FOB/EXW/CIF/DDP), MOQ + unit, lead time, pack/origin/certs into notes. If list currency ≠ product currency, apply **market-average FX** from `exchange_rates` (editable; passthrough when no rate exists).
6. **Adjust per list** — edit price/MOQ/tiers for this list only; the product record is never mutated (`price_list_items` holds the snapshot).
7. **Use the list** — share via the Buyer Shares wizard or convert to a quote. Pricing on the buyer PDF, share room and draft quote all read the **same resolver**, so numbers never diverge.
8. **Navigate back** — breadcrumb `Catalog / Price Lists / <list>`; "← All price lists" and "← Back to Products" links throughout.

Invariants: Products = source of truth; a Price List **references** products (never the reverse); one shared pricing resolver feeds every surface; no second catalog space.

---

## 3. Prioritized fix plan (mapped to in-review issues)

### P0 / P1 — correctness & IA (do first)

1. **Single canonical pricing resolver** — add `resolveProductPricing(orgId, productIds)` in `src/lib/catalog-share/` that returns per-product/variant EXW/FOB/CIF/DDP from `product_pricing_rules` + `product_prices` (reuse `query-core` logic). Point `/api/price-lists/products`, `catalog-hub`, `computeProductReadiness`, the Share Wizard, buyer PDF and quote conversion at it. Stop reading flat `products.*_price`. → **S34-CATALOG-039, -040, -041.**
2. **Fix readiness** — `computeProductReadiness` takes resolver output, so "Missing Price" reflects reality. → **S34-CATALOG-041.**
3. **Make `/products` the hub** — add **Price Lists** + **Buyer Shares** tabs to the Products workspace; add a rail sub-entry; breadcrumbs + back links. → **S34-CATALOG-043.**
4. **Demote `/catalog`** — convert Catalog Hub into the **Buyer-Shares command center only** (remove its duplicate Products list/editor; deep-link to `/products`). → **S34-CATALOG-038.**
5. **Reconcile KPIs** — all counts derive from the same product/price-list queries as `/products`. → **S34-CATALOG-044.**

### P2 — data quality & polish

6. **Unpollute market/segment dropdowns** — source from `markets`, lead/buyer-segment data and existing lists; never product categories. → **S34-CATALOG-042.**
7. **FX wiring** — seed/fetch `exchange_rates`; resolver converts to list currency with market-average rate, editable, passthrough when absent. → *new issue* **S34-CATALOG-045 (Market-average FX for price-list conversion).**
8. **One-time flat-column reconcile** — backfill or drop `products.fob_price/exw_price/cif_price/ddp_price` so no surface can read them again. → *new issue* **S34-CATALOG-046 (Retire flat product price columns / backfill from rules).**

### Remove / deprecate

- `public/internal/catalog-price-list-qa.html` — conceptual role replaced by `public/internal/products-price-list-workflow.html` (this prototype). Keep only as a historical QA artifact.
- The Catalog Hub **Products** tab (editor duplication).
- All reads of flat `products.*_price` columns across the app.

### Refactor

- Centralise pricing reads behind the resolver (one import everywhere).
- `priceForIncoterm()` in `price-list-manager.tsx` → call the resolver output instead of flat columns.

### Add

- Price Lists / Buyer Shares tabs + rail sub-entry on `/products`; breadcrumbs.
- `resolveProductPricing` service + FX conversion.
- New issues **S34-CATALOG-045** (FX) and **-046** (retire flat columns).

---

## 4. Deliverables

- **Interactive prototype:** `public/internal/products-price-list-workflow.html` — starts at Products, shows the Price Lists tab, list creation, product add with canonical auto-fill + FX, per-list adjustment, and back-navigation.
- **This document:** audit, corrected workflow, fix plan mapped to `S34-CATALOG-038…044` (+ proposed -045/-046).
