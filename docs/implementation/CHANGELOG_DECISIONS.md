# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are complete at 100% after Sprint 4 final closure.

Reason:

- Production is advancing through small approved one-commit passes on `main`.
- Sprint 3 Setu Guru routing/live-context behavior is deployed and verified.
- Sprint 4 product catalog UX maturity is complete after READY deployment and final smoke review.

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
- Products workspace gained compact operational shortcuts.
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

---

## 2026-05-07 — Sprint 4 final closure

Decision:

- Verified `53678eac76cb1b77bf40c9e5b9fd02661b277ef0` is READY before closing Sprint 4.
- Smoke review found no blocking defects in Products route composition, Product Management action links, product drawer tabs, product table row actions, product-default pricing save path, or quote-only pricing boundary.
- Closed Sprint 4 Product catalog UX maturity at 100%.
- Moved the next roadmap focus to Sprint 5 Quote builder and quote PDF maturity.
- No product UI behavior, save path, schema, quote-specific pricing behavior, HSN API, or Setu Guru action code was changed in this closure pass.

Files:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`
- `docs/implementation/SPRINT_4_COMPLETION_READINESS.md`
- `docs/help/products.md`

Reason:

- Ritesh approved closing Sprint 4 after READY verification and smoke-check review if no defects appeared.
- The closure pass is documentation-only so the deployed product UI remains unchanged.

Build:

- BUILDING / pending after this closure-doc commit
- Baseline before pass: `53678eac76cb1b77bf40c9e5b9fd02661b277ef0`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100% complete.
