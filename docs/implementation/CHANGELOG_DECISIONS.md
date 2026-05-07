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
- READY `e7124880fa8b2afd7b1f4702f587747948c0d3c1` — Clarify quote builder action steps

---

## 2026-05-07 — Sprint 5 send and approval checkpoint clarity

Decision:

- Verified `e7124880fa8b2afd7b1f4702f587747948c0d3c1` is READY before this pass.
- The quote builder now labels the last step as `Send & approval checkpoint`.
- The Terms step now states that approvals stay explicit before customer-send actions.
- The Review step now includes PDF readiness alongside selected currency, totals, quote-only overrides, and approval state.
- The Send step now states the exact boundary: blockers clear, approval approved or not required, and the customer-send decision is intentional.
- Quotes help and tests now protect the rule that send must use the existing checkpoint and must not add parallel quick-send or duplicate action surfaces.
- The final visual PDF check still needs a generated production screenshot from an authenticated quote record.
- No quote-only pricing write-back, product default write-back, HSN API, schema, send endpoint, or duplicate quote action surface was added.

Files:

- `src/features/quotes/logic/wizard-config.ts`
- `tests/quote-builder-action-clarity.test.mjs`
- `docs/help/quotes.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved verifying the deployment, visually re-smoke-checking the quote PDF, and tightening quote send/approval clarity without adding duplicate quote action surfaces.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `e7124880fa8b2afd7b1f4702f587747948c0d3c1`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
