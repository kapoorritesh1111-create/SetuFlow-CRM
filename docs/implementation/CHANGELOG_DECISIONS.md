# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

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
