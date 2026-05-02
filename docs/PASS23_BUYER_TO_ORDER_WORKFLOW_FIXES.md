# Pass 23 Buyer-to-Order Workflow Fixes

## Scope

Implemented the buyer workflow corrections from Test Case 1 v2:

1. Product interest is available in Quick Add before first save.
2. Quick Add shows an inline saved confirmation banner.
3. Lead Command Center displays contact name/job/email in the header.
4. Coverage remains product-specific and no longer expands selected categories into every product in the category.
5. Quote draft seeding only seeds explicitly mapped products with positive pricing.
6. Stale seeded quote lines outside the current lead coverage are pruned when opening/refreshing a draft.
7. Zero-price auto-seeded quote lines are removed instead of blocking quote progression.
8. Inline Send Gate shows a Direct Order panel with a Mark as direct order action.

## Supabase

Checked the live Supabase project for the direct-order RPC:

- `app_ensure_contract_for_accepted_quote_tx(uuid, uuid, uuid, text)` exists.

No new SQL mitigation is required for this pass.

## Retest

1. Open `/leads`.
2. Quick Add a buyer.
3. Select the exact product interests before saving.
4. Confirm a green saved confirmation appears.
5. Confirm the lead opens with contact details visible in the command center header.
6. Create/open quote.
7. Confirm the quote seeds only the selected products.
8. Confirm zero-price test catalog rows are not added as blocking lines.
9. Go to Send Gate.
10. Confirm the Deal closed directly panel is visible.
11. Mark as direct order.
12. Verify the resulting order under `/orders`.
