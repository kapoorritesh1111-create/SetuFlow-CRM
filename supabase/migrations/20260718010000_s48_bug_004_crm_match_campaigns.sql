-- Sprint 48 BUG-004: repeatable internal CRM match campaigns
create table if not exists public.crm_match_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  icp_profile_id uuid references public.org_icp_profiles(id) on delete set null,
  icp_profile_name text not null,
  icp_profile_version integer not null,
  filters jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_match_campaigns_org_status_idx
  on public.crm_match_campaigns(org_id, status, updated_at desc);

alter table public.crm_match_campaigns enable row level security;

drop policy if exists crm_match_campaigns_org_member on public.crm_match_campaigns;
create policy crm_match_campaigns_org_member
  on public.crm_match_campaigns
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
