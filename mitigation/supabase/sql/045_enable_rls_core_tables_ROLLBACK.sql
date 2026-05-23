-- 045_enable_rls_core_tables_ROLLBACK.sql
-- Emergency rollback for 045_enable_rls_core_tables.sql.
-- Use only during an incident where the RLS rollout must be reversed.
-- Data is not deleted by this rollback.

begin;

alter table if exists public.organization_members disable row level security;
alter table if exists public.roles disable row level security;
alter table if exists public.user_roles disable row level security;
alter table if exists public.leads disable row level security;
alter table if exists public.lead_markets disable row level security;
alter table if exists public.lead_product_interests disable row level security;
alter table if exists public.lead_follow_ups disable row level security;
alter table if exists public.lead_activities disable row level security;
alter table if exists public.lead_stage_history disable row level security;
alter table if exists public.products disable row level security;
alter table if exists public.product_categories disable row level security;
alter table if exists public.markets disable row level security;
alter table if exists public.countries disable row level security;
alter table if exists public.trade_events disable row level security;
alter table if exists public.rfqs disable row level security;
alter table if exists public.rfq_line_items disable row level security;
alter table if exists public.quotes disable row level security;
alter table if exists public.quote_line_items disable row level security;
alter table if exists public.contracts disable row level security;
alter table if exists public.contract_line_items disable row level security;
alter table if exists public.audit_logs disable row level security;

commit;
