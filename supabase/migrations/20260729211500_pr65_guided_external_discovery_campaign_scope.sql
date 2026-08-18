-- PR65: guided External Discovery campaign scope.
-- Additive only: existing campaigns, RLS policies, jobs, and opportunities remain untouched.

alter table public.external_discovery_campaigns
  add column if not exists campaign_mode text not null default 'saved_icp',
  add column if not exists research_direction text not null default 'buyers',
  add column if not exists scope_status text not null default 'draft',
  add column if not exists search_config jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'external_discovery_campaigns_campaign_mode_check'
      and conrelid = 'public.external_discovery_campaigns'::regclass
  ) then
    alter table public.external_discovery_campaigns
      add constraint external_discovery_campaigns_campaign_mode_check
      check (campaign_mode in ('saved_icp','new_market','lookalike','fresh_research','supplier_partner'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'external_discovery_campaigns_research_direction_check'
      and conrelid = 'public.external_discovery_campaigns'::regclass
  ) then
    alter table public.external_discovery_campaigns
      add constraint external_discovery_campaigns_research_direction_check
      check (research_direction in ('buyers','suppliers','partners','manufacturers'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'external_discovery_campaigns_scope_status_check'
      and conrelid = 'public.external_discovery_campaigns'::regclass
  ) then
    alter table public.external_discovery_campaigns
      add constraint external_discovery_campaigns_scope_status_check
      check (scope_status in ('draft','needs_input','ready','researching','completed','archived'));
  end if;
end $$;

create index if not exists external_campaigns_org_scope_idx
  on public.external_discovery_campaigns(org_id, scope_status, updated_at desc);

comment on column public.external_discovery_campaigns.campaign_mode is
  'How the guided campaign was started: saved ICP, new market, lookalike, fresh research, or supplier/partner search.';
comment on column public.external_discovery_campaigns.research_direction is
  'The single research side used by the job. Buyer and supplier targets are never combined.';
comment on column public.external_discovery_campaigns.scope_status is
  'Readiness of the guided campaign scope, independent of the provider job status.';
comment on column public.external_discovery_campaigns.search_config is
  'Resolved campaign-specific research scope. Campaign values override the saved ICP without changing it.';
