# Orders live Catalog line picker

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-20

## Purpose

In Orders Execution Cockpit v2, the **Actual Lines** stage lets an operator add a new actual buyer order line from live Catalog pricing without mutating the accepted quote version.

## Behavior

- **Add catalog product** uses live active Catalog pricing rows for the current organization from `active_product_pricing_rules_v`.
- The product picker is searchable/typeahead-style.
- Operators can search by:
  - product name;
  - SKU / code;
  - HSN / HS code;
  - variant or pack label;
  - pricing type;
  - visible price basis such as FOB, EXW, or BULK.
- Selecting a product sets the hidden `catalog_pricing_rule_id` submitted to the existing add-line server action.
- The server action reloads the selected pricing rule by current organization before inserting the order line.
- Catalog-linked order lines preserve catalog/pricing lineage through pricing and product snapshots.
- Default unit price is resolved from the selected catalog pricing rule when the operator does not override it.
- Currency for catalog-linked rules is currently USD because the active pricing view exposes normalized USD prices.

## Empty and fallback states

- If no quoteable catalog rows are available, Orders falls back to active Catalog products for the same organization and labels that behavior truthfully.
- If no active products exist for the organization, show: **No active catalog products found for this organization. Check Catalog setup.**
- Do not fake products or load another organization's products.
- If catalog data appears blocked, fix the organization/RLS/query path rather than adding placeholder products.

## Manual line boundary

Manual lines are separate from catalog-linked lines.

Manual lines may be used only when the operator provides clear reason/context. They are not catalog-linked and should not be described as preserving catalog pricing lineage.

## Approval boundary

- Accepted quote versions and accepted quote line items are never mutated by Actual Lines changes.
- Human approval of actual lines is required before Buyer Doc unlocks.
- Setu Guru may explain the picker, blockers, and catalog lineage, but must not approve actual lines or advance stages autonomously.

## Common Setu Guru answers

**Why can I search by SKU or HSN?** The picker searches live Catalog pricing row metadata including product name, SKU/code, HSN/HS code, pack label, and pricing type.

**What happens after I select a product?** The hidden `catalog_pricing_rule_id` is submitted. The server verifies the rule belongs to the current organization, then stores catalog/product/pricing snapshots on the actual order line.

**Does this change the accepted quote?** No. The accepted quote version remains immutable. Actual Lines records the buyer's actual order execution truth separately.

**Can I add a product if Catalog is empty?** Only as a manual line with reason/context. The UI must make clear that the line is manual and not catalog-linked.
