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
- Compliance Assist now becomes the next maturity focus for blocker/advisory/waiver/dispatch-deferral clarity.

---

## 2026-05-07 — Sprint 6 inline quote preview compliance action

Decision:

- Production screenshot showed the quote preview red blocker panel still had only Back to Command Center and Refresh draft after fix.
- Added a client-side quote compliance fix enhancer mounted in the authenticated app layout.
- The enhancer targets the quote preview blocker text and adds a direct **Fix compliance** action to `/compliance/assist?leadId=<lead-id>` when the active lead id is discoverable from the page.
- The enhancer also adds short inline guidance: open the fix panel to see the exact reason, attach evidence, waive for quote, or defer to dispatch with a reviewer reason.
- This is intentionally additive and does not change quote send logic, compliance status logic, schema, approvals, or waiver behavior.

Files:

- `src/app/(app)/layout.tsx`
- `src/features/leads/components/quote-compliance-fix-enhancer.tsx`
- `tests/quote-compliance-fix-enhancer.test.mjs`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Build:

- BUILDING / pending after this pass
- Baseline before pass: `3940b1e95a2aa8913d9fb1ff958f3b63b8b03b2c`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
