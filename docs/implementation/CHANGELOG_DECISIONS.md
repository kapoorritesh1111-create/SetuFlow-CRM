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
- Sprint 3 Setu Guru routing/live-context behavior is deployed and verified.
- Sprint 4 product catalog UX maturity is complete after READY deployment and final smoke review.
- Quote PDFs must be buyer-ready, professional, selected-currency aware, and complete enough for price-list sharing.

---

## 2026-05-07 — HSN questions must use live research and catalog review

Decision:

- Setu Guru HSN questions like “what is HSN code for vacuum cooked banana chips” must route to live org search/research, not static Products help.
- For banana chips, Setu Guru returns draft candidate HSN `2008.99.99`, checks the catalog HSN, and asks for human approval before any catalog update.

Build:

- READY
- Commit: `a2b48499ad96684bfad73ad15c96678e652bcd0f`

---

## 2026-05-07 — Approval-safe HSN apply and Setu Guru action buttons

Decision:

- Add `/api/setu-guru/apply-hsn` for reviewed catalog HSN updates.
- Require authenticated workspace, `catalog.manage`, explicit approval, unique product-name match, stale current-HSN check, product + variant update, and audit logging before applying reviewed HSN.
- Setu Guru action buttons now have safe handlers for source review, live research follow-up, blocker check, known navigation, unknown actions, and approved HSN apply.
- Unknown action buttons are queued in the composer instead of dead-clicking.

Build:

- READY
- Commit: `e7feb89de0caa18c53e005b8c9f12bc959880241`

---

## 2026-05-07 — Route-specific Setu Guru action routing

Decision:

- HSN research now includes catalog `productId` so `/api/setu-guru/apply-hsn` can update the exact product even when names repeat.
- `/api/setu-guru/apply-hsn` prefers `productId` and falls back to unique product-name matching only when no ID is available.
- `/api/setu-guru/org-search` now returns `actionHrefs` for quote/compliance answers so each action can route to its own destination.
- The Setu Guru drawer reads `actionHrefs` and still falls back to route registry mapping or composer queueing when no route is available.

Build:

- READY
- Commit: `8a2d8d866cc5e11ca9edddf4a23a73f84f635b31`

---

## 2026-05-07 — Order action routing remains guidance-only

Decision:

- Order Setu Guru actions now include `Check order blockers`, `Draft dispatch evidence checklist`, and `Review order approval boundary`.
- The drawer handles these actions by running blocker guidance, queueing a dispatch checklist prompt, or explaining approval boundaries.
- No order write-back endpoint or order state mutation was added.
- Action feedback now tells the user whether Setu Guru queued guidance, routed the user, or stopped at a human-approval boundary.

Build:

- READY
- Commit: `fbbc8349069d6de6546c039227eef27a453568d5`

---

## 2026-05-07 — Sprint 3 production drawer verification and closure

Decision:

- Verified the latest Vercel production deployment for `fbbc8349069d6de6546c039227eef27a453568d5` is READY.
- Reviewed the protected Setu Guru drawer/action behavior for HSN, quote/compliance, order guidance-only actions, source rows, and non-dead button handling.
- Closed Sprint 3 at 100% and moved the roadmap focus to Sprint 4 Product catalog UX maturity.
- No product, quote, order, compliance, or Supabase schema write-back changes were made in this closure pass.

Build:

- READY
- Commit: `27a4d981d037a1d1d0741e5b8d35d3efebdc2f10`

---

## 2026-05-07 — Sprint 4 product catalog UX sequence

Decision:

- Sprint 4 started from verified READY production commit `27a4d981d037a1d1d0741e5b8d35d3efebdc2f10`.
- Product guidance separates Products, Product Management, catalog readiness, and source-backed research.
- Products help documents product-default, category-default, organization-default, and quote-only boundaries.
- Product Management gained action-map and clearer governance row CTAs.
- Products workspace gained compact operational shortcuts, then the top shortcut card was removed when it duplicated the better lower control surface.
- Product detail drawer preserved protected tabs and stayed business-label focused.
- Product table row actions/readiness cues use compact operational labels.
- Product screens and drawer must not carry help-style or development-style explanatory text; policy belongs in docs and Setu Guru knowledge.

Builds:

- READY `88ca1f62a18e80e9a90ca6c78ed9fcb9dd69daa5` — Clarify Setu Guru catalog actions
- READY `d6c2a3e1c12aeebfdf4bd1ab0052d806e7621e45` — Clarify Product Management action rows
- READY `2811ebb2d76a407beff3ec241ca9777654fd8ba7` — Add Products workspace action map
- READY `be19063efa8f703c6c1144b36638c2817ecd55ff` — Clarify product drawer action guidance
- READY `93891e419853309942c9d9deac627a83f87c54d1` — Tighten product table readiness UI
- READY `53678eac76cb1b77bf40c9e5b9fd02661b277ef0` — Document Sprint 4 closure readiness
- READY `ee8c363b293b4697d03b4b35c8a0e9cc18edef97` — Close Sprint 4 product catalog UX
- READY `d602a5ae7bffbd991276b211427968f8547d071d` — Remove duplicate Products shortcut panel

---

## 2026-05-07 — Sprint 5 professional quote PDF price-list table

Decision:

- Verified `d602a5ae7bffbd991276b211427968f8547d071d` is READY before starting the Sprint 5 PDF pass.
- Quote PDF now uses a professional white/slate layout with restrained navy accents instead of heavy saturated blue panels.
- Quote PDF line table now includes SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency Line total.
- Line total is calculated as MOQ cases × Case price.
- Case price is calculated as Unit price × Units/Case.
- Currency labels use `quote.display_currency ?? quote.currency ?? organization.default_currency`, not hardcoded USD columns.
- Quote help and tests now document the professional PDF table and selected-currency rule.
- No quote-only pricing write-back, product default write-back, HSN API, schema, or duplicate quote action surface was added.

Build:

- READY
- Commit: `9a671811c7b36931a3e8b13da5c21425c21b51c2`

---

## 2026-05-07 — Sprint 5 quote PDF table-fit correction

Decision:

- Verified `9a671811c7b36931a3e8b13da5c21425c21b51c2` is READY before applying the table-fit correction.
- Production smoke check confirmed improved PDF color/professionalism but found the price-list table still had two layout defects: `MOQ (cases)`/`Basis` crowding and clipped `Total` column.
- Tightened the quote PDF table grid, shortened the MOQ header to `MOQ cases`, widened the printable table area, and adjusted column widths/font sizes so SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, selected-currency Unit price, selected-currency Case price, and Total all fit on page.
- No quote-only pricing write-back, product default write-back, HSN API, schema, or duplicate quote action surface was added.

Files:

- `src/app/api/quotes/[quoteId]/pdf/route.ts`
- `tests/quote-pdf-layout.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh supplied the generated PDF screenshot after the first Sprint 5 PDF pass; it showed a remaining table-fit issue despite improved styling.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `9a671811c7b36931a3e8b13da5c21425c21b51c2`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
