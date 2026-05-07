# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are complete at 100% after Sprint 4 final closure.
- UI cleanup should reduce duplicate work surfaces, not add repeated shortcut cards or redundant buttons.
- Sprint 5 Quote builder and quote PDF maturity is active.

Reason:

- Production is advancing through small approved one-commit passes on `main`.
- Quote PDFs must be buyer-ready, professional, selected-currency aware, and complete enough for price-list sharing.

---

## 2026-05-07 — Sprint 5 professional quote PDF price-list table

Decision:

- Quote PDF now uses a professional white/slate layout with restrained navy accents instead of heavy saturated blue panels.
- Quote PDF line table includes SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency Line total.
- Line total is calculated as MOQ cases × Case price.
- Currency labels use `quote.display_currency ?? quote.currency ?? organization.default_currency`, not hardcoded USD columns.
- Production smoke checks corrected clipped Total and crowded MOQ/Basis columns.
- Seller block now includes organization address details and a visible Tax ID line.
- Pack, units/case, and MOQ use catalog data first and safe SKU/product fallbacks when older records are sparse.
- Quote line price is treated as case price for price-list exports, with unit price derived by dividing by units/case.
- Vertical whitespace between quote PDF sections was tightened.
- No quote-only pricing write-back, product default write-back, HSN API, schema, or duplicate quote action surface was added.

Builds:

- READY `9a671811c7b36931a3e8b13da5c21425c21b51c2` — Redesign quote PDF price list
- READY `8d24fa9857fd19d04872c257efc5fe156fab6c72` — Fit quote PDF price columns

---

## 2026-05-07 — Sprint 5 quote PDF seller/pack/spacing polish

Decision:

- Verified `8d24fa9857fd19d04872c257efc5fe156fab6c72` is READY before applying this polish pass.
- Ritesh's PDF screenshot showed remaining issues: missing Pack values, excess section whitespace, missing seller city/postcode/country details, and missing visible Tax ID line.
- Added seller city, postal code, headquarters country, and Tax ID to the quote PDF seller block.
- Added catalog-first pack values and fallback snack pack inference for sparse older quote/catalog records.
- Added catalog-first units/case and MOQ cases with safe fallback values for sparse snack records.
- Tightened table row height and downstream section spacing to reduce large whitespace gaps.
- Adjusted price-list semantics so case price uses the quote line price, unit price derives from case price ÷ units/case, and total remains MOQ cases × case price.
- No quote-only pricing write-back, product default write-back, HSN API, schema, or duplicate quote action surface was added.

Files:

- `src/app/api/quotes/[quoteId]/pdf/route.ts`
- `tests/quote-pdf-layout.test.mjs`
- `docs/help/quotes.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh supplied a generated PDF screenshot after the table-fit correction and identified missing buyer-facing seller/product details.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `8d24fa9857fd19d04872c257efc5fe156fab6c72`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
