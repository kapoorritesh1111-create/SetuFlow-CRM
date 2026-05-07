# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1 and Sprint 2 are complete at 100%.

Reason:

- Production is now advancing through small approved one-commit passes on `main`.

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

- BUILDING / pending after this pass
- Baseline before pass: `e7feb89de0caa18c53e005b8c9f12bc959880241`

---

## 2026-05-07 — Order action routing remains guidance-only

Decision:

- Order Setu Guru actions now include `Check order blockers`, `Draft dispatch evidence checklist`, and `Review order approval boundary`.
- The drawer handles these actions by running blocker guidance, queueing a dispatch checklist prompt, or explaining approval boundaries.
- No order write-back endpoint or order state mutation was added.
- Action feedback now tells the user whether Setu Guru queued guidance, routed the user, or stopped at a human-approval boundary.

Files:

- `src/lib/setu-guru/help-registry.ts`
- `src/features/setu-guru/setu-guru-widget.tsx`
- `docs/help/orders.md`
- `tests/setu-guru.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved tightening order route actions and richer success/failure states.
- Order execution actions are high-impact and must stay guidance-only until an explicit approval-safe write path is designed.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `8a2d8d866cc5e11ca9edddf4a23a73f84f635b31`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1 and Sprint 2 remain 100% complete.
