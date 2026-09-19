-- C3 Batch 1: remove proven duplicate/redundant indexes.
-- Production verification completed before source-control sync.

drop index if exists public.idx_catshare_token;
drop index if exists public.client_entitlement_profiles_org_idx;
drop index if exists public.smc_team_members_user_id_idx;

drop index if exists public.idx_lead_product_interests_org_lead;
drop index if exists public.idx_order_lines_order;
drop index if exists public.idx_packing_plan_lines_plan;
