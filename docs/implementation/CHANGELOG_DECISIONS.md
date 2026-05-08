# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-08 — Sprint 6 quote compliance decision idempotency

Decision:

- `/api/compliance/quote-fix` now treats Waive and Defer as idempotent reviewer decisions for the same quote/action/requirement context.
- Repeated Waive/Defer clicks update the existing quote-level clearance document instead of creating another quote waiver/dispatch-deferral row.
- Lead-level gate clearance rows are also upsert-like/idempotent by quote, lead, and requirement code, so repeated clicks update the previous clearance row.
- Attach evidence remains intentionally non-idempotent because each uploaded evidence item can be a distinct document.
- The same action still records an audit log, clears open compliance items, approves quote/version posture, and refreshes the current quote version line count from persisted `quote_line_items`.
- Supabase schema was checked before implementation; the fix uses existing columns only and does not require a migration.

Files:

- `src/app/api/compliance/quote-fix/route.ts`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No schema change.
- No silent waiver/defer; reason and reviewer permission are still required.
- No quote PDF/share/send route change.
- Evidence uploads can still create multiple rows by design.
- Audit trail remains appended for each human action attempt.

---

## 2026-05-08 — Sprint 6 compliance regression rollback and gate source fix

Decision:

- Production screenshots showed the layout-mounted quote compliance panel caused major UI regression: it stayed visible on the main lead queue after leaving quote review.
- Removed the global quote review compliance panel from the authenticated layout. Compliance action UI must not be mounted globally.
- Production also showed waiver/defer saved a quote waiver, but the red blocker remained. The quote gate uses lead-level document requirement state from `buildLeadDocumentRequirementState`, which only reads `documents` where `related_entity = lead`.
- The quote-fix API now records the quote-scoped waiver/defer document, and also writes approved lead-level requirement documents for any missing mandatory quote-send document rules.
- The quote-fix API still approves open lead compliance items and records the human reason/audit trail.
- Supabase MCP tooling was not exposed in this session, so the DB correction was made by aligning the API with the repository gate source of truth in `src/lib/document-requirements.ts`.

Files:

- `src/app/(app)/layout.tsx`
- `src/app/api/compliance/quote-fix/route.ts`
- `tests/quote-compliance-gate-source.test.mjs`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No schema change.
- No hidden DOM injection.
- No global compliance overlay.
- No quote PDF/share/send behavior change.
- Waiver/defer reason remains recorded on quote document and audit log.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100% complete.
