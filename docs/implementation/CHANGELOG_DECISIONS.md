# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

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
