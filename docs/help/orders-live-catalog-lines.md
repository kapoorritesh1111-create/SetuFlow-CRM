# Orders live Catalog line picker

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Purpose

In Orders Execution Cockpit v2, the **Actual Lines** stage lets an operator add a new actual buyer order line from live Catalog pricing without mutating the accepted quote version.

This is the canonical behavior after the Sprint 18 production hardening pass: live Catalog products must come from the current workspace organization, selected Catalog rows must be re-verified on submit, and catalog-linked order lines must preserve pricing lineage.

## Current fixed behavior

- **Add catalog product** uses live active Catalog pricing rows for the current organization from `active_product_pricing_rules_v`.
- `/orders` server-rendered options are loaded in `src/app/(app)/orders/layout.tsx`, not only by a client-side helper.
- The loader first tries quoteable active pricing rows for the authenticated workspace organization.
- If the authenticated query returns no rows, the loader falls back to active rows for the same organization.
- If the view/query path is blocked while the workspace organization is already verified, the loader may use the service-role/admin client as a **verified-organization fallback** scoped strictly to that organization.
- The add-line server action re-verifies the selected `catalog_pricing_rule_id` against the same verified organization before inserting the order line.
- The add-line server action also has a verified-organization admin fallback for the pricing-rule lookup so a Catalog product shown by the server loader can also be submitted successfully.
- Do not fake products, do not use another organization's products, and do not add placeholder product options.

## Picker/search behavior

Operators can search by:

- product name;
- SKU / code;
- HSN / HS code;
- variant or pack label;
- pricing type;
- visible price basis such as FOB, EXW, or BULK.

The option label should expose enough context for a human operator to choose safely:

```text
Product name · Pack label · SKU · HSN code · Pricing type · Price basis USD price
```

## Submit behavior

Selecting a product sets `catalog_pricing_rule_id` in the add-line form.

On submit, `addManualActualOrderLineAction` must:

1. confirm the user has order write capability;
2. resolve the current order by the verified organization and source quote;
3. re-read the selected `catalog_pricing_rule_id` from `active_product_pricing_rules_v` scoped to the verified organization;
4. use the admin fallback only after organization membership is verified and only with `organization_id` + selected rule id;
5. preserve `product_id`, `product_variant_id`, product name, pack label, SKU, HSN, pricing type, pricing basis, price columns, FX metadata, product snapshot, and pricing snapshot;
6. default unit price from the selected Catalog pricing rule when the operator does not override it;
7. insert an `order_lines` row with `change_type='added_catalog_after_quote'`;
8. write audit history and revalidate `/orders`.

## Empty and fallback states

- If no quoteable catalog rows are available, Orders falls back to active Catalog products for the same organization and labels that behavior truthfully.
- If no active products exist for the organization, show: **No active catalog products found for this organization. Check Catalog setup.**
- Do not show “No quoteable catalog options were returned” when active/quoteable products exist for the organization. That means the query path is broken, not Catalog setup.
- If catalog data appears blocked by RLS/view/session mismatch, fix the organization/RLS/query path rather than adding fake options.

## Manual line boundary

Manual lines are separate from catalog-linked lines.

Manual lines may be used only when the operator provides clear reason/context. They are not catalog-linked and should not be described as preserving catalog pricing lineage.

Manual line fields should be labeled clearly as manual and should not be confused with live Catalog product selection.

## Removed line behavior

- Added/manual lines that are removed should disappear from the active Actual Lines table/editor.
- Removed added/manual lines remain in audit/activity history; they should not continue to render as active order lines.
- Order total and discount base calculations should ignore `line_status='removed'` rows.
- Accepted quote line items remain immutable. Removing an actual line does not mutate the accepted quote version.

## Approval boundary

- Accepted quote versions and accepted quote line items are never mutated by Actual Lines changes.
- Human approval of actual lines is required before Buyer Doc unlocks.
- Setu Guru may explain the picker, blockers, and catalog lineage, but must not approve actual lines or advance stages autonomously.

## Common Setu Guru answers

**Why can I search by SKU or HSN?** The picker searches live Catalog pricing row metadata including product name, SKU/code, HSN/HS code, pack label, pricing type, and visible price basis.

**What happens after I select a product?** The selected `catalog_pricing_rule_id` is submitted. The server verifies the rule belongs to the current organization, then stores catalog/product/pricing snapshots on the actual order line.

**Why did products show but adding failed earlier?** The server-rendered Orders loader had been fixed before the submit action. The dropdown could show products, but the add-line server action still used only the regular user client to re-read the selected rule. The fixed behavior is that both loader and submit action use the same verified-organization fallback pattern.

**Does this change the accepted quote?** No. The accepted quote version remains immutable. Actual Lines records the buyer's actual order execution truth separately.

**Can I add a product if Catalog is empty?** Only as a manual line with reason/context. The UI must make clear that the line is manual and not catalog-linked.

**Should a removed line still show in Actual Lines?** No. Removed added/manual lines should not show as active/editable lines. They should remain in audit/activity history only.
