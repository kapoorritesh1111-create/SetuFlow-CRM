alter table public.client_entitlement_profiles
  add column if not exists max_leads integer not null default 0 check (max_leads >= 0),
  add column if not exists max_quotes integer not null default 0 check (max_quotes >= 0),
  add column if not exists max_orders integer not null default 0 check (max_orders >= 0),
  add column if not exists max_users integer not null default 0 check (max_users >= 0),
  add column if not exists allow_exports boolean not null default true,
  add column if not exists allow_invites boolean not null default true,
  add column if not exists allow_settings_edit boolean not null default true,
  add column if not exists allow_dispatch boolean not null default true,
  add column if not exists guided_mode_enabled boolean not null default false,
  add column if not exists trial_template_key text;

alter table public.client_entitlement_profiles
  drop constraint if exists client_entitlement_profiles_trial_template_key_check;

alter table public.client_entitlement_profiles
  add constraint client_entitlement_profiles_trial_template_key_check
  check (
    trial_template_key is null
    or trial_template_key in (
      'export_foods_basic',
      'ingredient_trader',
      'distributor_importer',
      'packaging_converter'
    )
  );

create index if not exists client_entitlement_profiles_trial_idx
  on public.client_entitlement_profiles(organization_id)
  where billing_status = 'trial' or guided_mode_enabled is true;

create or replace function public.is_trial_org(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.client_entitlement_profiles cep
    where cep.organization_id = p_organization_id
      and cep.billing_status = 'trial'
      and (cep.trial_ends_at is null or cep.trial_ends_at >= current_date)
  );
$$;

create or replace function public.get_trial_capability(p_organization_id uuid)
returns table (
  organization_id uuid,
  is_trial boolean,
  guided_mode_enabled boolean,
  trial_template_key text,
  max_leads integer,
  max_quotes integer,
  max_orders integer,
  max_users integer,
  allow_exports boolean,
  allow_invites boolean,
  allow_settings_edit boolean,
  allow_dispatch boolean,
  leads_used integer,
  quotes_used integer,
  orders_used integer,
  users_used integer,
  lead_slots_remaining integer,
  quote_slots_remaining integer,
  order_slots_remaining integer,
  user_slots_remaining integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with entitlement as (
    select
      cep.organization_id,
      cep.billing_status = 'trial'
        and (cep.trial_ends_at is null or cep.trial_ends_at >= current_date) as is_trial,
      cep.guided_mode_enabled,
      cep.trial_template_key,
      cep.max_leads,
      cep.max_quotes,
      cep.max_orders,
      cep.max_users,
      cep.allow_exports,
      cep.allow_invites,
      cep.allow_settings_edit,
      cep.allow_dispatch
    from public.client_entitlement_profiles cep
    where cep.organization_id = p_organization_id
  ), usage as (
    select
      p_organization_id as organization_id,
      (select count(*)::integer from public.leads l where l.organization_id = p_organization_id) as leads_used,
      (select count(*)::integer from public.quotes q where q.organization_id = p_organization_id) as quotes_used,
      (select count(*)::integer from public.orders o where o.organization_id = p_organization_id) as orders_used,
      (select count(*)::integer from public.organization_members om where om.organization_id = p_organization_id and om.is_active is true) as users_used
  )
  select
    e.organization_id,
    e.is_trial,
    e.guided_mode_enabled,
    e.trial_template_key,
    e.max_leads,
    e.max_quotes,
    e.max_orders,
    e.max_users,
    e.allow_exports,
    e.allow_invites,
    e.allow_settings_edit,
    e.allow_dispatch,
    u.leads_used,
    u.quotes_used,
    u.orders_used,
    u.users_used,
    case when e.max_leads = 0 then null else greatest(e.max_leads - u.leads_used, 0) end as lead_slots_remaining,
    case when e.max_quotes = 0 then null else greatest(e.max_quotes - u.quotes_used, 0) end as quote_slots_remaining,
    case when e.max_orders = 0 then null else greatest(e.max_orders - u.orders_used, 0) end as order_slots_remaining,
    case when e.max_users = 0 then null else greatest(e.max_users - u.users_used, 0) end as user_slots_remaining
  from entitlement e
  cross join usage u;
$$;

create or replace function public.create_guided_trial_entitlement(
  p_organization_id uuid,
  p_managed_by_organization_id uuid default null,
  p_trial_template_key text default 'export_foods_basic',
  p_trial_ends_at date default (current_date + 14)
)
returns public.client_entitlement_profiles
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  entitlement public.client_entitlement_profiles;
begin
  if p_trial_template_key not in ('export_foods_basic', 'ingredient_trader', 'distributor_importer', 'packaging_converter') then
    raise exception 'Unsupported trial template key: %', p_trial_template_key;
  end if;

  insert into public.client_entitlement_profiles (
    organization_id,
    managed_by_organization_id,
    plan_key,
    billing_status,
    onboarding_stage,
    seat_limit,
    max_leads,
    max_quotes,
    max_orders,
    max_users,
    allow_exports,
    allow_invites,
    allow_settings_edit,
    allow_dispatch,
    guided_mode_enabled,
    trial_template_key,
    overage_policy,
    trial_ends_at
  ) values (
    p_organization_id,
    p_managed_by_organization_id,
    'starter',
    'trial',
    'provision',
    1,
    2,
    1,
    1,
    1,
    false,
    false,
    false,
    true,
    true,
    p_trial_template_key,
    'block_at_limit',
    p_trial_ends_at
  )
  on conflict (organization_id) do update set
    managed_by_organization_id = coalesce(excluded.managed_by_organization_id, public.client_entitlement_profiles.managed_by_organization_id),
    plan_key = excluded.plan_key,
    billing_status = excluded.billing_status,
    onboarding_stage = excluded.onboarding_stage,
    seat_limit = excluded.seat_limit,
    max_leads = excluded.max_leads,
    max_quotes = excluded.max_quotes,
    max_orders = excluded.max_orders,
    max_users = excluded.max_users,
    allow_exports = excluded.allow_exports,
    allow_invites = excluded.allow_invites,
    allow_settings_edit = excluded.allow_settings_edit,
    allow_dispatch = excluded.allow_dispatch,
    guided_mode_enabled = excluded.guided_mode_enabled,
    trial_template_key = excluded.trial_template_key,
    overage_policy = excluded.overage_policy,
    trial_ends_at = excluded.trial_ends_at,
    updated_at = now()
  returning * into entitlement;

  return entitlement;
end;
$$;

grant execute on function public.is_trial_org(uuid) to authenticated, service_role;
grant execute on function public.get_trial_capability(uuid) to authenticated, service_role;
grant execute on function public.create_guided_trial_entitlement(uuid, uuid, text, date) to service_role;
