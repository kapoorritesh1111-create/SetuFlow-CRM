# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 10G closeout and Setu Guru final update

Decision:

- Sprint 10 Import wizard and catalog onboarding maturity is now closed at 100% after Ritesh completed visual testing.
- Latest READY baseline before closeout: `5b8f015ec597339484d75fef57efdd36cf511c19` / `dpl_3PGsMegvGCnYdAHAtzzrGzLxh7PP`.
- Roadmap now marks Sprint 10 as `DONE` and protects import/setup/cleanup behavior from future drift.
- Setu Guru troubleshooting, workflow, runtime manifest, and knowledge instructions now teach:
  - Catalog Admin vs Products separation;
  - pricing defaults → categories → products + variants setup order;
  - product/category CSV template expectations;
  - import result review and downloadable summaries;
  - Import History coverage card meanings;
  - owner/admin-only product cleanup with two-year quote/order guard;
  - typed confirmation behavior and audit preservation.
- No application code behavior changed in this closeout pass.

Files:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/setu-guru/SETUFLOW_TROUBLESHOOTING.md`
- `docs/setu-guru/SETUFLOW_WORKFLOWS.md`
- `docs/setu-guru/SETU_GURU_KNOWLEDGE_BASE_INSTRUCTIONS.md`
- `public/setu-guru/knowledge-manifest.json`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No importer persistence behavior was changed.
- No product cleanup eligibility guard was changed.
- No schema migration was introduced.
- No `npm ci` was run.
- Do not reopen Sprint 10 unless a production screenshot shows a defect in import, coverage cards, or owner/admin product cleanup.

---

## 2026-05-10 — Sprint 10F import coverage cards and cleanup confirmation fix

Decision:

- Import History now shows setup coverage cards using the Sprint 10E coverage payload: import audit trail, products without variants, and pricing-rule coverage.
- The no-history empty state distinguishes a brand-new workspace from a workspace that already has catalog data but no recorded import runs.
- Product cleanup confirmation now returns the same lowercase confirmation phrase style shown in the UI and validates confirmation case-insensitively on the server.
- Cleanup remains owner/admin-only and protected by the 2-year quote/order guard.

Files:

- `src/features/admin/components/import-history-panel.tsx`
- `src/app/api/admin/catalog/delete-product/route.ts`
- `docs/implementation/CHANGELOG_DECISIONS.md`

---

## 2026-05-10 — Sprint 10E production import smoke-check and coverage payload

Decision:

- Latest production deployment was verified READY before the pass.
- Production smoke-check compared SETU Flow main org and Avanti Foods Limited catalog setup through Supabase-safe reads.
- Main org has import-run history plus category/product/variant/pricing-rule coverage from Sprint 10C/D.
- Avanti workspace has category and product catalog data, but no recorded import runs yet and most products still need variants/pricing-rule completion through the Sprint 10 import wizard.
- Import history API returns setup coverage counts in addition to recent import runs.

---

## 2026-05-10 — Sprint 10D import history and audit UI

Decision:

- Catalog Admin includes a reusable Import History panel backed by `import_runs` and `import_issues`.
- The panel shows recent import runs, status, row counters, warning/blocker counts, row-level summaries, issue details, and downloadable CSV reports.
- The panel appears in the Imports work area and Import History/Audit work area.

---

## 2026-05-10 — Sprint 10C import wizard result review polish and product import engine completeness

Decision:

- Product CSV imports create/update products, variants, and pricing rules from imported price fields in one import flow.
- Imports create an `import_runs` record, persist issues, record audit logs, and return row summaries.
- The import wizard stays open after a successful import so operators can review summaries before refreshing.

---

## 2026-05-10 — Sprint 10B import order and protected product cleanup

Decision:

- Catalog Admin import/setup order is **Pricing calculator/defaults first, Categories second, Products + variants third**.
- Product cleanup belongs only in Catalog Admin Data cleanup, not in daily Products.
- Cleanup is owner/admin-only, requires eligibility check, reason, typed confirmation, and preserves historical/audit records.

---

## 2026-05-10 — Sprint 10A Catalog Admin and import template direction

Decision:

- Admin → Product management is now **Catalog Admin**, a back-office setup and governance control center.
- `/products` remains the day-to-day product workspace.
- Product/category import templates were expanded to include setup fields needed for quote-ready catalog onboarding.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete.
