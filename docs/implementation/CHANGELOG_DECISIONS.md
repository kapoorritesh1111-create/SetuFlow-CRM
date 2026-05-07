# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1, Sprint 2, and Sprint 3 are complete at 100% after the Sprint 3 production drawer verification pass.

Reason:

- Production is advancing through small approved one-commit passes on `main`.
- Sprint 3 Setu Guru routing/live-context behavior is now deployed and verification found no blocking defects.

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

## 2026-05-07 — Sprint 4 catalog action clarity kickoff

Decision:

- Start Sprint 4 from verified READY production commit `27a4d981d037a1d1d0741e5b8d35d3efebdc2f10`.
- Setu Guru product guidance now separates daily Products editing, Product Management governance/import/default work, catalog readiness checks, and source-backed live research.
- Products help now documents the product default, category default, organization default, and quote-only boundary.
- No product pricing save path, quote-specific pricing path, HSN apply API, schema, or product drawer tab behavior was changed.

Build:

- READY
- Commit: `88ca1f62a18e80e9a90ca6c78ed9fcb9dd69daa5`

---

## 2026-05-07 — Sprint 4 Product Management action-map clarity

Decision:

- Verified `88ca1f62a18e80e9a90ca6c78ed9fcb9dd69daa5` is READY before continuing Sprint 4.
- Product Management now shows an action map that separates Products, Product Management, and Quotes responsibilities.
- Governance workbench rows now use clearer action labels for pricing gaps, variant setup, trade fields, imports, product calculator access, and approval posture.
- Products help records the Product Management action-row policy so Setu Guru can guide users without mixing product defaults and quote-only pricing.
- No product save handler, pricing save handler, quote-specific pricing path, HSN apply API, database schema, or product drawer tab behavior was changed.

Build:

- READY
- Commit: `d6c2a3e1c12aeebfdf4bd1ab0052d806e7621e45`

---

## 2026-05-07 — Sprint 4 Products workspace action map

Decision:

- Verified `d6c2a3e1c12aeebfdf4bd1ab0052d806e7621e45` is READY before continuing Sprint 4.
- Products workspace now renders an action map before the spreadsheet/table so users can choose catalog gaps, quote-ready products, product setup, or pricing coverage explicitly.
- The action map routes through existing query filters and does not add product save, pricing save, delete, distribution, or quote-pricing behavior.
- Products help documents how Setu Guru should explain the Products workspace action map.

Build:

- READY
- Commit: `2811ebb2d76a407beff3ec241ca9777654fd8ba7`

---

## 2026-05-07 — Sprint 4 product detail drawer guidance

Decision:

- Verified `2811ebb2d76a407beff3ec241ca9777654fd8ba7` is READY before continuing Sprint 4.
- Product detail drawer explains each tab's action purpose and boundary before showing tab content.
- Pricing tab copy reinforces that saved calculator changes are product defaults future quotes can inherit.
- Variant tab clarifies SKU/pack/MOQ/quote-ready review versus customer-specific quote pricing.
- No product save handler, delete handler, pricing calculator save behavior, quote-specific pricing path, HSN apply API, database schema, or drawer tab removal was changed.

Build:

- READY
- Commit: `be19063efa8f703c6c1144b36638c2817ecd55ff`

---

## 2026-05-07 — Sprint 4 strict product UI polish

Decision:

- Verified `be19063efa8f703c6c1144b36638c2817ecd55ff` is READY before continuing Sprint 4.
- Product screens and drawer should not carry help-style or development-style explanatory text; business UI should stay compact and operational.
- Products workspace shortcuts now use concise labels instead of explanatory help copy.
- Product detail drawer guidance card was removed from the screen; Setu Guru/Product help keeps that policy instead.
- Product table row actions and readiness cues now use clearer operational labels: readiness, action, open pricing/open product, and quick quote.
- No product save handler, delete handler, pricing calculator save behavior, quote-specific pricing path, HSN apply API, database schema, or drawer tab removal was changed.

Files:

- `src/features/products/components/products-workspace-action-map.tsx`
- `src/features/products/components/products-table.tsx`
- `src/features/products/components/product-detail-drawer.tsx`
- `src/features/products/lib/products-gap-utils.ts`
- `docs/help/products.md`
- `tests/product-detail-drawer-guidance.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved tightening product table row actions, empty/blocked states, and variant/pricing readiness cues with the explicit instruction that product screens and drawer should not gain help or development text.
- The safest implementation keeps UI copy operational and moves explanatory policy into docs and Setu Guru knowledge.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `be19063efa8f703c6c1144b36638c2817ecd55ff`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, and Sprint 3 remain 100% complete.
