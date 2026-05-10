# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 7C Lead table smoke-check clarity

Decision:

- Lead table smoke-check target was made clearer while protecting the Sprint 7B row model.
- Row click and **Open** remain the primary paths into the Lead Command Center.
- The secondary action control is now labeled **More** instead of a bare ellipsis.
- The action column header now says **Open / More**.
- **More** still contains **Continue quote**, **Edit lead**, and **Delete lead**.
- The blocked row pill was shortened to **Blocked** to reduce row density without changing compliance or blocker source-of-truth behavior.
- Setu Guru lead help now explains the **Open / More** lead row model.

Files:

- `src/features/leads/ui/lead-table-row.tsx`
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

## 2026-05-10 — Sprint 7B Lead list/table action cleanup

Decision:

- Lead list row action density was reduced.
- The row itself still opens the Lead Command Center.
- The visible row CTA is now only **Open**.
- Secondary actions moved into the compact More menu:
  - **Continue quote**;
  - **Edit lead**;
  - **Delete lead**.
- Delete no longer competes as a visible inline lead-row CTA.
- Lead table action column width was reduced to reflect the cleaner action model.
- Setu Guru lead help now explains that row click/Open is the primary path and More contains secondary actions.

Files:

- `src/features/leads/ui/lead-table-row.tsx`
- `docs/help/leads.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

---

## 2026-05-10 — Sprint 7A Lead Command Center action hierarchy

Decision:

- Sprint 7 Lead command center cleanup is active.
- The Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote** or **Create quote**.
- **Plan follow-up** and **Edit lead** remain visible as secondary actions.
- Won/Lost actions moved into a deliberate **Close lead outcome** area so terminal status changes do not compete with quote continuation.
- The protected quote route remains `/leads` → open lead → **Continue quote** → **Step 4 — Review** for compliance/document blockers.
- Setu Guru lead help now explains the action hierarchy and warns not to mark leads won/lost without explicit human intent.

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
