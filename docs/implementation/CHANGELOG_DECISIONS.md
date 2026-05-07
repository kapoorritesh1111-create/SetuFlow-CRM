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
- Quote PDFs and quote share links must be buyer-ready, professional, selected-currency aware, branded, and complete enough for client sharing.

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
- READY `e4df72ebf04ba61117495f9d2fa54734652764d3` — Clarify quote send approval checkpoint

---

## 2026-05-07 — Sprint 5 professional quote share flow

Decision:

- Verified `09ac180a8bec9a96c7af60ded4321e1101e6b452` is READY before this pass.
- Production smoke check confirmed the share link opens `https://www.setuflowcrm.com/api/quotes/[quoteId]/share`, returns branded HTML, includes **Open quote PDF**, and no longer shows raw JSON.
- Smoke check also found the page showed fallback SETU branding instead of the org logo because anonymous public reads cannot reliably resolve private org profile fields.
- Fixed this by making the authenticated WhatsApp/share generator embed safe org branding fields in the share URL: buyer name, org name, safe HTTPS logo URL, and org website.
- Public share page can now render org logo/name/website from safe URL fields without requiring buyer authentication.
- The fallback SETU mark remains for missing or unsafe logo URLs.
- No quote-only pricing write-back, product default write-back, HSN API, schema, send endpoint duplication, or duplicate quote action surface was added.

Files:

- `src/features/quotes/server/whatsapp-delivery.ts`
- `tests/quote-share-flow.test.mjs`
- `docs/help/quotes.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved verifying the production share page and explicitly asked for org-logo branding on the buyer-facing page.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `09ac180a8bec9a96c7af60ded4321e1101e6b452`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
