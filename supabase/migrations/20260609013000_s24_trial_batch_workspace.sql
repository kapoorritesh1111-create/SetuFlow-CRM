-- S24-TRIAL batch: guided trial templates, capability alignment, and Stark Packmate pricing helper.

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
    or trial_template_key in ('export_foods_basic', 'ingredient_trader', 'distributor_importer', 'packaging_converter')
  );

drop function if exists public.get_trial_capability(uuid) cascade;

create or replace function public.get_trial_capability(p_organization_id uuid)
returns table (
  organization_id uuid,
  is_trial boolean,
  billing_status text,
  trial_ends_at timestamptz,
  trial_template_key text,
  max_leads integer,
  max_quotes integer,
  max_orders integer,
  max_users integer,
  lead_count integer,
  quote_count integer,
  order_count integer,
  active_user_count integer,
  remaining_leads integer,
  remaining_quotes integer,
  remaining_orders integer,
  remaining_users integer,
  allow_exports boolean,
  allow_invites boolean,
  allow_settings_edit boolean,
  allow_dispatch boolean,
  guided_mode_enabled boolean,
  overage_policy text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with entitlement as (
    select
      cep.organization_id,
      cep.billing_status,
      cep.trial_ends_at::timestamptz as trial_ends_at,
      cep.billing_status = 'trial'
        and (cep.trial_ends_at is null or cep.trial_ends_at >= current_date) as is_trial,
      cep.guided_mode_enabled,
      cep.trial_template_key,
      nullif(cep.max_leads, 0) as max_leads,
      nullif(cep.max_quotes, 0) as max_quotes,
      nullif(cep.max_orders, 0) as max_orders,
      nullif(cep.max_users, 0) as max_users,
      cep.allow_exports,
      cep.allow_invites,
      cep.allow_settings_edit,
      cep.allow_dispatch,
      cep.overage_policy
    from public.client_entitlement_profiles cep
    where cep.organization_id = p_organization_id
  ), usage as (
    select
      p_organization_id as organization_id,
      (select count(*)::integer from public.leads l where l.organization_id = p_organization_id) as lead_count,
      (select count(*)::integer from public.quotes q where q.organization_id = p_organization_id) as quote_count,
      (select count(*)::integer from public.orders o where o.organization_id = p_organization_id) as order_count,
      (select count(*)::integer from public.organization_members om where om.organization_id = p_organization_id and om.is_active is true) as active_user_count
  )
  select
    e.organization_id,
    e.is_trial,
    e.billing_status,
    e.trial_ends_at,
    e.trial_template_key,
    e.max_leads,
    e.max_quotes,
    e.max_orders,
    e.max_users,
    u.lead_count,
    u.quote_count,
    u.order_count,
    u.active_user_count,
    case when e.max_leads is null then null else greatest(e.max_leads - u.lead_count, 0) end as remaining_leads,
    case when e.max_quotes is null then null else greatest(e.max_quotes - u.quote_count, 0) end as remaining_quotes,
    case when e.max_orders is null then null else greatest(e.max_orders - u.order_count, 0) end as remaining_orders,
    case when e.max_users is null then null else greatest(e.max_users - u.active_user_count, 0) end as remaining_users,
    e.allow_exports,
    e.allow_invites,
    e.allow_settings_edit,
    e.allow_dispatch,
    e.guided_mode_enabled,
    e.overage_policy
  from entitlement e
  cross join usage u;
$$;

grant execute on function public.get_trial_capability(uuid) to authenticated, service_role;

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
    'guided_trial',
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

grant execute on function public.create_guided_trial_entitlement(uuid, uuid, text, date) to service_role;

create or replace function public.calculate_stark_packmate_dimensional_price(
  p_width_in numeric,
  p_height_in numeric,
  p_depth_in numeric,
  p_quantity integer default 1,
  p_material text default 'corrugated'
)
returns table (
  surface_area numeric,
  material_factor numeric,
  quantity_break numeric,
  unit_price numeric,
  extended_price numeric
)
language sql
stable
set search_path to 'public'
as $$
  with normalized as (
    select
      greatest(coalesce(p_width_in, 0), 0) as width_in,
      greatest(coalesce(p_height_in, 0), 0) as height_in,
      greatest(coalesce(p_depth_in, 0), 0) as depth_in,
      greatest(coalesce(p_quantity, 1), 1) as quantity,
      case
        when lower(coalesce(p_material, 'corrugated')) = 'paperboard' then 0.014::numeric
        when lower(coalesce(p_material, 'corrugated')) = 'kraft' then 0.012::numeric
        else 0.018::numeric
      end as material_factor
  ), priced as (
    select
      2 * ((width_in * height_in) + (width_in * depth_in) + (height_in * depth_in)) as surface_area,
      material_factor,
      case
        when quantity >= 5000 then 0.18::numeric
        when quantity >= 1000 then 0.10::numeric
        when quantity >= 250 then 0.04::numeric
        else 0::numeric
      end as quantity_break,
      quantity
    from normalized
  )
  select
    surface_area,
    material_factor,
    quantity_break,
    round(greatest(0.18, 0.22 + surface_area * material_factor - quantity_break), 2) as unit_price,
    round(greatest(0.18, 0.22 + surface_area * material_factor - quantity_break) * quantity, 2) as extended_price
  from priced;
$$;

grant execute on function public.calculate_stark_packmate_dimensional_price(numeric, numeric, numeric, integer, text) to authenticated, service_role;

create or replace function public.enforce_guided_trial_insert_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  capability record;
  action_kind text;
  used_count integer;
  max_count integer;
  allow_action boolean := true;
begin
  if new.organization_id is null then
    return new;
  end if;

  select *
    into capability
  from public.get_trial_capability(new.organization_id)
  limit 1;

  if capability is null or coalesce(capability.is_trial, false) = false then
    return new;
  end if;

  if capability.trial_ends_at is not null and capability.trial_ends_at::date < current_date then
    raise exception 'Guided trial has expired. Convert the workspace before continuing.'
      using errcode = 'P0001';
  end if;

  action_kind := tg_argv[0];

  if action_kind = 'create_lead' then
    used_count := coalesce(capability.lead_count, 0);
    max_count := capability.max_leads;
  elsif action_kind = 'create_quote' then
    used_count := coalesce(capability.quote_count, 0);
    max_count := capability.max_quotes;
  elsif action_kind = 'create_order' then
    used_count := coalesce(capability.order_count, 0);
    max_count := capability.max_orders;
  elsif action_kind = 'invite_user' then
    allow_action := coalesce(capability.allow_invites, false);
    used_count := coalesce(capability.active_user_count, 0);
    max_count := capability.max_users;
  else
    return new;
  end if;

  if allow_action = false then
    raise exception 'Guided trial does not allow this action.'
      using errcode = 'P0001';
  end if;

  if max_count is not null and used_count >= max_count then
    raise exception 'Guided trial limit reached for %. Convert the workspace before continuing.', action_kind
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_guided_trial_insert_limit() from public;
grant execute on function public.enforce_guided_trial_insert_limit() to authenticated, service_role;

drop trigger if exists s24_trial_194_enforce_lead_limit on public.leads;
create trigger s24_trial_194_enforce_lead_limit
before insert on public.leads
for each row execute function public.enforce_guided_trial_insert_limit('create_lead');

drop trigger if exists s24_trial_194_enforce_quote_limit on public.quotes;
create trigger s24_trial_194_enforce_quote_limit
before insert on public.quotes
for each row execute function public.enforce_guided_trial_insert_limit('create_quote');

drop trigger if exists s24_trial_194_enforce_order_limit on public.orders;
create trigger s24_trial_194_enforce_order_limit
before insert on public.orders
for each row execute function public.enforce_guided_trial_insert_limit('create_order');

drop trigger if exists s24_trial_194_enforce_invite_limit on public.organization_invitations;
create trigger s24_trial_194_enforce_invite_limit
before insert on public.organization_invitations
for each row execute function public.enforce_guided_trial_insert_limit('invite_user');
