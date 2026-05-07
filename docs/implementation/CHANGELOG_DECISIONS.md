# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are complete at 100%.
- UI cleanup should reduce duplicate work surfaces, not add repeated shortcut cards or redundant buttons.
- Sprint 6 Compliance Assist maturity is active.

Reason:

- Production is advancing through small approved one-commit passes on `main`.
- Sprint 5 quote PDF/share/send work is closed and protected.
- Compliance Assist now becomes the next maturity focus for blocker/advisory/waiver clarity.

---

## 2026-05-07 — Sprint 5 professional quote PDF, send, and share closure

Decision:

- Quote PDF now uses a professional white/slate layout with restrained navy accents and includes SKU, Product, Pack (g), Units/Case, MOQ, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency Line total.
- Line total is calculated as MOQ cases × Case price.
- Currency labels use `quote.display_currency ?? quote.currency ?? organization.default_currency`, not hardcoded USD columns.
- Seller block includes organization address details and a visible Tax ID line.
- Quote builder/send/share controls use one clear sequence and no duplicate quote action surfaces.
- Quote share links use production-domain buyer-facing HTML pages with **Open quote PDF**, organization branding where available, and no raw JSON placeholder output.
- Sprint 5 was closed at 100% in `7747aaf816c28b77dd8af67600c6e2544b11a9b8`.

Protected:

- Do not reintroduce heavy saturated PDF panels.
- Do not remove quote PDF pack, units/case, MOQ, Basis, unit price, case price, line total, seller address, or Tax ID details.
- Do not expose Vercel preview URLs or raw JSON placeholders in buyer-facing quote share links.
- Do not write quote-only prices back to product/category/organization defaults.

---

## 2026-05-07 — Sprint 6 Compliance Assist blocker/advisory/waiver clarity

Decision:

- Verified `7747aaf816c28b77dd8af67600c6e2544b11a9b8` is READY before starting Sprint 6.
- Inspected Compliance Assist route, quote/lead compliance entry points, Setu Guru compliance help, and Setu Guru compliance policy.
- Compliance Assist now labels and explains three states clearly: required quote-send blocker, advisory dispatch prep, and human-reviewed waiver decision.
- Added a compact decision guide in the existing Compliance Assist flow so users understand what blocks quote send, what is later dispatch/order prep, and what requires human review.
- Evidence submission copy now states it is review intake and does not auto-approve evidence.
- Waiver copy now states it is a reviewed human decision requiring permission and a reason.
- Updated `docs/help/compliance.md` so Setu Guru uses the same blocker/advisory/waiver language.
- No schema, quote send behavior, waiver backend, approval backend, compliance policy, or silent write-back behavior was changed.

Files:

- `src/app/(app)/compliance/assist/page.tsx`
- `docs/help/compliance.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Build:

- BUILDING / pending after this pass
- Baseline before pass: `7747aaf816c28b77dd8af67600c6e2544b11a9b8`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
