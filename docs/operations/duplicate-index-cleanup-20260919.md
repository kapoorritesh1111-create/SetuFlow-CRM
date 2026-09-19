# C3 Duplicate Index Cleanup

Date: 2026-09-19

## Batch 1

Removed six redundant indexes after proving retained equivalents.

Coverage-redundant indexes removed:
- public.idx_catshare_token
- public.client_entitlement_profiles_org_idx
- public.smc_team_members_user_id_idx

Advisor exact-duplicate indexes removed:
- public.idx_lead_product_interests_org_lead
- public.idx_order_lines_order
- public.idx_packing_plan_lines_plan

For the advisor-listed exact duplicates, definitions matched on key columns, operator classes, collation, sort options, and predicates. None of the removed indexes were constraint-owned.

Supabase duplicate-index advisor count moved from 22 to 19.

Continue in 2-3 exact-duplicate groups per batch. Do not remove constraint-backed unique indexes unless the retained equivalent is proven and constraint ownership is handled deliberately.
