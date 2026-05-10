# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 7A Lead Command Center action hierarchy

Decision:

- Sprint 7 Lead command center cleanup is active.
- The Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote** or **Create quote**.
- **Plan follow-up** and **Edit lead** remain visible as secondary actions.
- Won/Lost actions moved into a deliberate **Close lead outcome** area so terminal status changes do not compete with quote continuation.
- The protected quote route remains `/leads` → open lead → **Continue quote** → **Step 4 — Review** for compliance/document blockers.
- Setu Guru lead help now explains the action hierarchy and warns not to mark leads won/lost without explicit human intent.

Files:

- `src/features/leads/command-center/LeadStickyActionBar.tsx`
- `docs/help/leads.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote PDF/share/send behavior was changed.
- No quote Review compliance behavior was changed.
- No Catalog Admin/import/product cleanup behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 10G closeout and Setu Guru final update

Decision:

- Sprint 10 Import wizard and catalog onboarding maturity is now closed at 100% after Ritesh completed visual testing.
- Roadmap marks Sprint 10 as `DONE` and protects import/setup/cleanup behavior from future drift.
- Setu Guru troubleshooting, workflow, runtime manifest, and knowledge instructions teach Catalog Admin setup, import history, and cleanup behavior.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete.
- Sprint 7 is active.
