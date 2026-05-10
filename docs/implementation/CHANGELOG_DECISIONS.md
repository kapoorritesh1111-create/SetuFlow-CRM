# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-10 — Sprint 10A Catalog Admin and import template direction

Decision:

- Admin → Product management is now treated as **Catalog Admin**, a back-office setup and governance control center, not a duplicate of the `/products` commercial catalog workspace.
- `/products` remains the day-to-day workspace for product row edits, variant edits, units per case, MOQ, product-specific pricing snapshots, and quote-ready catalog work.
- Catalog Admin owns setup health, master-data direction, import center entry points, pricing defaults, admin issues, and audit posture.
- The full setup import path belongs in Catalog Admin/workspace setup. Product-only import shortcuts can remain in Products, but categories and all-in-one onboarding should not be hidden only inside the product page.
- Product CSV templates now include the setup fields needed for a new org: SKU, brand, category, subcategory, variant, pack label, pack size, units per case, MOQ cases/KG, pricing mode, trade defaults, HSN, starting prices, and row action.
- Category CSV templates now include hierarchy and default trade/setup fields: parent, code, sort order, active status, default origin, shelf life, lead time, and shipment notes.
- This pass intentionally updates admin IA, template headers, export headers, validation, and Setu Guru guidance before the deeper importer engine work.

Files:

- `src/app/(app)/admin/product-management/page.tsx`
- `src/features/admin/components/product-governance-workbench.tsx`
- `src/lib/import-export-templates.ts`
- `docs/setu-guru/SETUFLOW_TROUBLESHOOTING.md`
- `public/setu-guru/knowledge-manifest.json`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Protected:

- No quote/compliance/PDF/share/send behavior was changed.
- No global compliance overlay, sticky helper, DOM injection, or MutationObserver was added.
- No schema migration was introduced.
- No `npm ci` was run.
- Import persistence remains org-scoped and protected by workspace auth + catalog.manage permission.

---

## Operating rules retained

- Ask approval before GitHub writes.
- One final commit per approved pass.
- Do not run `npm ci` in sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not write back without explicit human approval.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, and Sprint 6 are 100% complete.
