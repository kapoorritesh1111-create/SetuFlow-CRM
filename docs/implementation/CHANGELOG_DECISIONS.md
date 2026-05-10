# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 10F import coverage cards and cleanup confirmation fix

Decision:

- Import History now shows setup coverage cards using the Sprint 10E coverage payload: import audit trail, products without variants, and pricing-rule coverage.
- The no-history empty state now distinguishes a brand-new workspace from a workspace that already has catalog data but no recorded import runs.
- Product cleanup confirmation now returns the same lowercase confirmation phrase style shown in the UI and validates confirmation case-insensitively on the server.
- This fixes the issue where an eligible product could remain blocked because the typed confirmation used lowercase text.
- Delete remains owner/admin-only and protected by the 2-year quote/order guard.

Files:

- `src/features/admin/components/import-history-panel.tsx`
- `src/app/api/admin/catalog/delete-product/route.ts`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No importer persistence behavior was changed.
- No product cleanup eligibility guard was weakened.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 10E production import smoke-check and coverage payload

Decision:

- Latest production deployment was verified READY before the pass.
- Production smoke-check compared SETU Flow main org and Avanti Foods Limited catalog setup through Supabase-safe reads.
- Main org has import-run history plus category/product/variant/pricing-rule coverage from Sprint 10C/D.
- Avanti workspace has category and product catalog data, but no recorded import runs yet and most products still need variants/pricing-rule completion through the Sprint 10 import wizard.
- Import history API now returns setup coverage counts in addition to recent import runs: categories, products, variants, pricing rules, import runs, and products without variants.
- UI behavior remains stable for this pass; the coverage payload enables the next tiny UI pass to show workspace setup gap cards without changing importer behavior.

Files:

- `src/app/api/admin/catalog/import-history/route.ts`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No importer persistence behavior was changed.
- No product cleanup behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.
- No catalog data was seeded or mutated during smoke-checks.

---

## 2026-05-10 — Sprint 10D import history and audit UI

Decision:

- Catalog Admin now includes a reusable Import History panel backed by `import_runs` and `import_issues`.
- The Import History panel shows recent import runs, status, row counters, warning/blocker counts, row-level summaries, issue details, and downloadable CSV reports.
- The panel appears in the Imports work area and the Import history/Audit work area so operators can review prior import results after leaving the immediate import drawer.
- Catalog Admin now highlights recent import blockers as a setup-health metric.
- No import persistence, product cleanup, quote, compliance, PDF, share, or send behavior changed.

Files:

- `src/features/admin/components/import-history-panel.tsx`
- `src/app/(app)/admin/product-management/page.tsx`
- `src/features/admin/components/product-governance-workbench.tsx`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No importer persistence behavior was changed.
- No product cleanup behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 10C import wizard result review polish

Decision:

- The import wizard no longer immediately refreshes after a successful product/category import.
- Operators now stay inside the import drawer and can review the returned import run summary before refreshing the catalog.
- The drawer shows inserted, updated, skipped, pricing rules created, and pricing rules updated counts.
- Row-level import summaries are displayed in the drawer and can be downloaded as CSV.
- A manual **Refresh catalog** button reloads the page after the operator reviews the result.

Files:

- `src/features/products/components/catalog-import-export-wizard.tsx`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No importer persistence behavior was changed.
- No product cleanup behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 10C product import engine completeness

Decision:

- Product CSV imports now create/update products, variants, and pricing rules from imported price fields in one import flow.
- Imported price columns are mapped into `product_pricing_rules` using the active default `pricing_rule_sets` row, or a new default rule set when none exists.
- Supported price inputs include `ex_factory_per_unit`, `exw_price`, `fob_per_unit`, `fob_price`, and `bulk_price_per_kg` with USD/INR handling.
- Imports now create an `import_runs` record, update completion counters, persist blocking/warning issues in `import_issues`, and record an `audit_logs` import-run entry.
- Import API responses now include `import_run_id`, `pricingRulesCreated`, `pricingRulesUpdated`, and row summaries for operator review.

Files:

- `src/app/api/catalog/import-csv/route.ts`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No product cleanup behavior was changed.
- No schema migration was introduced.
- No `npm ci` was run.

---

## 2026-05-10 — Sprint 10B import order and protected product cleanup

Decision:

- Catalog Admin import/setup order is **Pricing calculator/defaults first, Categories second, Products + variants third**.
- Product deletion belongs only in **Admin → Catalog Admin → Data cleanup**, not in the daily `/products` workspace.
- Product cleanup delete is owner/admin-only. Catalog managers can manage catalog data but cannot mark products deleted unless they are also owner/admin.
- Cleanup deletion is a safe soft cleanup: product, variants, and pricing rows are removed from active catalog surfaces; historical quote/contract references and audit logs are preserved.
- Product cleanup blocks when active quote, quote-version, or contract/order usage exists in the last 2 years.
- Deletion requires search/select, eligibility check, human reason, and exact typed confirmation.
- Audit action recorded as `catalog_admin_mark_product_deleted`.

Files:

- `src/app/api/admin/catalog/delete-product/route.ts`
- `src/app/(app)/admin/product-management/page.tsx`
- `src/features/admin/components/product-governance-workbench.tsx`
- `src/features/products/components/catalog-import-export-wizard.tsx`
- `docs/setu-guru/SETUFLOW_TROUBLESHOOTING.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No global compliance overlay, sticky helper, DOM injection, or MutationObserver was added.
- No schema migration was introduced.
- No `npm ci` was run.
- Cleanup uses organization-scoped checks and preserves audit history.

---

## 2026-05-10 — Sprint 10A Catalog Admin and import template direction

Decision:

- Admin → Product management is now treated as **Catalog Admin**, a back-office setup and governance control center, not a duplicate of the `/products` commercial catalog workspace.
- `/products` remains the day-to-day workspace for product row edits, variant edits, units per case, MOQ, product-specific pricing snapshots, and quote-ready catalog work.
- Catalog Admin owns setup health, master-data direction, import center entry points, pricing defaults, admin issues, and audit posture.
- Product CSV templates now include SKU, brand, category, subcategory, variant, pack label, pack size, units per case, MOQ cases/KG, pricing mode, trade defaults, HSN, starting prices, and row action.
- Category CSV templates now include hierarchy and default trade/setup fields.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, and Sprint 6 are 100% complete.
