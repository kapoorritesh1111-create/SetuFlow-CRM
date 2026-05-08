# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Sprint 6 inline quote-review compliance fix

Decision:

- Production screenshot showed the separate Compliance Assist page still felt disconnected from quote builder, and defer was not visibly saving in the quote workflow.
- Stopped using the separate Compliance Assist route as the primary quote-review blocker fix path.
- The quote-review blocker now gets inline **Fix here** controls directly inside the red quote builder panel.
- Inline controls save through `/api/compliance/quote-fix` and keep the operator on the same Review screen.
- The API records quote-scoped documents using `related_entity = quote` and `related_id = quoteId` for attach evidence, waive-for-quote, and defer-to-dispatch decisions.
- The inline panel shows success/error messages in place instead of silently failing or navigating to Step 1.
- This keeps the quote builder as the workflow home and leaves Compliance Assist as secondary/reference, not the default quote blocker repair surface.

Files:

- `src/features/leads/components/quote-compliance-fix-enhancer.tsx`
- `src/app/api/compliance/quote-fix/route.ts`
- `tests/inline-quote-compliance-fix.test.mjs`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No schema change.
- No quote send behavior change.
- No silent compliance clear.
- No duplicate quote action surface outside the existing blocker panel.
- No redirect to Compliance Assist for quote-review blocker repair.
- No npm ci.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
