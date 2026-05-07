# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Sprint 6 quote-scoped Compliance Assist fix panel

Decision:

- Verified `b693232f4d282499c1f4c43d38c2c1eaddda1b27` is READY before this pass.
- Production screenshot showed the inline **Fix compliance** button appeared, but opened Compliance Assist for a different lead because the enhancer guessed a lead id from unrelated page links.
- Fixed the route to prefer the active quote id and open `/compliance/assist?quoteId=<quote-id>`.
- Compliance Assist now resolves the correct `lead_id` server-side from the quote instead of trusting a guessed lead id.
- Removed page-wide unrelated lead-link guessing from the inline enhancer.
- Reworked Compliance Assist visual context so it feels connected to the lead → quote workflow, with active workflow context, quote label/status, Back to quote, and Open command center actions.
- Updated Compliance help and tests to protect quote-scoped routing and connected workflow context.
- No schema, quote send behavior, approval backend, compliance policy, duplicate action surface, or silent write-back behavior was added.

Files:

- `src/features/leads/components/quote-compliance-fix-enhancer.tsx`
- `src/app/(app)/compliance/assist/page.tsx`
- `tests/quote-compliance-fix-enhancer.test.mjs`
- `docs/help/compliance.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Build:

- BUILDING / pending after this pass
- Baseline before pass: `b693232f4d282499c1f4c43d38c2c1eaddda1b27`

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
