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
- READY `4b0be38ec0215fd4299e77d4c2394376f66cbbbd` — Polish quote PDF seller and pack details

---

## 2026-05-07 — Sprint 5 quote builder action clarity

Decision:

- Verified `4b0be38ec0215fd4299e77d4c2394376f66cbbbd` is READY before applying quote builder clarity.
- Production/deployed code-path smoke check confirms the quote PDF route includes pack fallback logic, seller city/postal/country fields, visible Tax ID, selected currency labels, and MOQ × case-price line totals.
- The final visual PDF check still needs a generated production screenshot from an authenticated quote record.
- Quote builder step labels now clarify the one primary sequence: Product & currency, Price lines, Terms & approval, Review totals, Send checkpoint.
- Quote builder descriptions now point users to pack/MOQ/units/case/pricing in the Price lines table and blockers/approvals/customer-send in the existing Send checkpoint.
- Quotes help and tests now protect the no-duplicate-quote-action-surface rule.
- No quote-only pricing write-back, product default write-back, HSN API, schema, or duplicate quote action surface was added.

Files:

- `src/features/quotes/logic/wizard-config.ts`
- `tests/quote-builder-action-clarity.test.mjs`
- `docs/help/quotes.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved re-smoke-checking the quote PDF expectations and then tightening quote builder action clarity without adding duplicate quote action surfaces.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `4b0be38ec0215fd4299e77d4c2394376f66cbbbd`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
