# Orders Sprint 18 production hardening notes

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Why this note exists

During Sprint 18 production QA, the Orders Execution Cockpit had three important real-world failures:

1. A removed added/manual line still appeared in the active Actual Lines table/editor.
2. Add catalog product showed a false empty warning even though the current organization had active quoteable Catalog pricing rows.
3. Catalog products became visible, but submitting one redirected to `catalog-pricing-rule-not-found` because the submit action could not re-read the selected rule through the same query path as the loader.

These are now documented as protected behavior for future work.

## Final fixed behavior

### Removed lines

- Added/manual lines that are removed should disappear from active Actual Lines UI.
- They should remain only in audit/activity history.
- Totals and discount base calculations should ignore `line_status='removed'` rows.
- Accepted quote lines and accepted quote versions remain immutable.

### Live Catalog options

- The visible `/orders` page receives Catalog options from `src/app/(app)/orders/layout.tsx`.
- The loader reads `active_product_pricing_rules_v` scoped by the verified workspace `organization_id`.
- It tries active + quoteable rows first.
- It falls back to active rows for the same organization if quoteable filtering unexpectedly returns none.
- If the authenticated query path is blocked but workspace organization is verified, the loader may use a service-role/admin fallback scoped strictly by `organization_id`.
- Do not fake products.
- Do not read or show another organization's products.

### Catalog-linked add line submit

- The add-line form submits `catalog_pricing_rule_id`.
- `addManualActualOrderLineAction` must re-read the selected Catalog pricing rule by current verified `organization_id` and selected rule id.
- The action must use the same safe fallback pattern as the loader: user client first, then service-role/admin fallback only after workspace membership and organization are verified.
- If the UI can show a Catalog rule but submit cannot find it, the server action is broken; do not blame Catalog setup.
- Inserted catalog-linked rows should use `change_type='added_catalog_after_quote'`.
- The inserted row should preserve product/pricing lineage in `product_snapshot` and `pricing_snapshot`.

## Setu Guru answer guidance

If a user asks why the Catalog dropdown is empty:

- First check whether the organization has active/quoteable pricing rows.
- If rows exist, explain that the loader/query path may be failing and should be fixed.
- Do not suggest adding fake/manual products as the primary fix.

If a user asks why adding a visible Catalog product fails:

- Explain that the submit action must re-verify the same `catalog_pricing_rule_id` in the same verified organization.
- A `catalog-pricing-rule-not-found` redirect usually means the action query path cannot read the selected pricing rule, not necessarily that the product is missing.

If a user asks where a removed line went:

- Explain that removed added/manual lines are no longer active order lines.
- They remain in audit/activity history.

## Files to inspect in future reviews

- `src/app/(app)/orders/layout.tsx`
- `src/features/orders/components/OrdersProductionWorkspace81DRepair3.tsx`
- `src/features/orders/server/order-line-actions.ts`
- `src/app/api/orders/catalog-options/route.ts`
- `docs/help/orders-live-catalog-lines.md`
- `docs/help/sprint-18-integration-ready.md`
- `docs/setu-guru/SPRINT_18_INTEGRATION_READY_GUIDE.md`
- `public/setu-guru/knowledge-manifest.json`
