create table if not exists public.client_entitlement_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_key text not null default 'enterprise',
  billing_status text not null default 'active',
  onboarding_stage text not null default 'intake',
  seat_limit integer not null default 25 check (seat_limit >= 1),
  guru_monthly_request_limit integer not null default 25000 check (guru_monthly_request_limit >= 0),
  guru_monthly_spend_limit numeric(12,2) not null default 2500 check (guru_monthly_spend_limit >= 0),
  overage_policy text not null default 'warn_then_block',
  trial_ends_at date,
  renews_at date,
  internal_notes text,
  managed_by_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_entitlement_profiles_org_unique unique (organization_id),
  constraint client_entitlement_profiles_plan_check check (plan_key in ('starter','growth','professional','enterprise','custom')),
  constraint client_entitlement_profiles_billing_check check (billing_status in ('trial','active','past_due','paused','cancelled')),
  constraint client_entitlement_profiles_stage_check check (onboarding_stage in ('intake','provision','invite','entitlements','live','paused')),
  constraint client_entitlement_profiles_overage_check check (overage_policy in ('warn_only','warn_then_block','allow_overage','block_at_limit'))
);

create table if not exists public.client_usage_rollups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month date not null,
  active_users integer not null default 0 check (active_users >= 0),
  pending_invites integer not null default 0 check (pending_invites >= 0),
  guru_requests_used integer not null default 0 check (guru_requests_used >= 0),
  guru_spend_used numeric(12,2) not null default 0 check (guru_spend_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_usage_rollups_org_period_unique unique (organization_id, period_month)
);

create index if not exists client_entitlement_profiles_org_idx on public.client_entitlement_profiles(organization_id);
create index if not exists client_entitlement_profiles_stage_idx on public.client_entitlement_profiles(onboarding_stage);
create index if not exists client_usage_rollups_org_month_idx on public.client_usage_rollups(organization_id, period_month desc);

alter table public.client_entitlement_profiles enable row level security;
alter table public.client_usage_rollups enable row level security;

drop policy if exists client_entitlement_profiles_select_member on public.client_entitlement_profiles;
drop policy if exists client_entitlement_profiles_manage_admin on public.client_entitlement_profiles;
drop policy if exists client_entitlement_profiles_select_platform_admin on public.client_entitlement_profiles;
drop policy if exists client_entitlement_profiles_insert_platform_admin on public.client_entitlement_profiles;
drop policy if exists client_entitlement_profiles_update_platform_admin on public.client_entitlement_profiles;
create policy client_entitlement_profiles_select_platform_admin
  on public.client_entitlement_profiles
  for select
  using (public.is_setu_platform_admin());
create policy client_entitlement_profiles_insert_platform_admin
  on public.client_entitlement_profiles
  for insert
  with check (public.is_setu_platform_admin());
create policy client_entitlement_profiles_update_platform_admin
  on public.client_entitlement_profiles
  for update
  using (public.is_setu_platform_admin())
  with check (public.is_setu_platform_admin());

drop policy if exists client_usage_rollups_select_member on public.client_usage_rollups;
drop policy if exists client_usage_rollups_manage_admin on public.client_usage_rollups;
drop policy if exists client_usage_rollups_select_platform_admin on public.client_usage_rollups;
drop policy if exists client_usage_rollups_insert_platform_admin on public.client_usage_rollups;
drop policy if exists client_usage_rollups_update_platform_admin on public.client_usage_rollups;
create policy client_usage_rollups_select_platform_admin
  on public.client_usage_rollups
  for select
  using (public.is_setu_platform_admin());
create policy client_usage_rollups_insert_platform_admin
  on public.client_usage_rollups
  for insert
  with check (public.is_setu_platform_admin());
create policy client_usage_rollups_update_platform_admin
  on public.client_usage_rollups
  for update
  using (public.is_setu_platform_admin())
  with check (public.is_setu_platform_admin());

drop trigger if exists client_entitlement_profiles_set_updated_at on public.client_entitlement_profiles;
create trigger client_entitlement_profiles_set_updated_at
before update on public.client_entitlement_profiles
for each row execute function public.set_updated_at();

drop trigger if exists client_usage_rollups_set_updated_at on public.client_usage_rollups;
create trigger client_usage_rollups_set_updated_at
before update on public.client_usage_rollups
for each row execute function public.set_updated_at();
