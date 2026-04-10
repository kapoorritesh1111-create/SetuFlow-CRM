-- 041_foundation_indexes_and_uniques.sql
-- Add the missing indexes and uniqueness protections that the app now relies on.

create index if not exists leads_org_stage_type_idx
  on public.leads (organization_id, stage_id, lead_type);

create index if not exists leads_org_owner_idx
  on public.leads (organization_id, owner_user_id);

create index if not exists leads_org_updated_at_idx
  on public.leads (organization_id, updated_at desc);

create index if not exists lead_follow_ups_org_status_scheduled_idx
  on public.lead_follow_ups (organization_id, status, scheduled_at);

create index if not exists lead_activities_org_lead_occurred_idx
  on public.lead_activities (organization_id, lead_id, occurred_at desc);

create index if not exists lead_stage_history_org_lead_changed_idx
  on public.lead_stage_history (organization_id, lead_id, changed_at desc);

create index if not exists products_org_active_name_idx
  on public.products (organization_id, is_active, name);

create index if not exists product_categories_org_parent_sort_idx
  on public.product_categories (organization_id, parent_id, sort_order);

create index if not exists markets_org_active_sort_idx
  on public.markets (organization_id, is_active, sort_order);

create index if not exists countries_org_market_active_sort_idx
  on public.countries (organization_id, market_id, is_active, sort_order);

create index if not exists pipeline_stages_pipeline_sort_idx
  on public.pipeline_stages (pipeline_id, sort_order);

create index if not exists rfqs_org_lead_created_idx
  on public.rfqs (organization_id, lead_id, created_at desc);

create index if not exists quotes_org_lead_created_idx
  on public.quotes (organization_id, lead_id, created_at desc);

create index if not exists contracts_org_lead_created_idx
  on public.contracts (organization_id, lead_id, created_at desc);

create unique index if not exists lead_markets_lead_market_unique_idx
  on public.lead_markets (lead_id, market_id);

create unique index if not exists lead_tags_lead_tag_unique_idx
  on public.lead_tags (lead_id, tag_id);

create unique index if not exists lead_product_interests_lead_product_unique_idx
  on public.lead_product_interests (lead_id, product_id)
  where product_id is not null;

create unique index if not exists organization_members_org_user_unique_idx
  on public.organization_members (organization_id, user_id);

create unique index if not exists user_roles_membership_role_unique_idx
  on public.user_roles (organization_member_id, role_id)
  where organization_member_id is not null and role_id is not null;
