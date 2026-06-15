-- Sprint 25 / S25-TS-001: Instant Trade Show Trial signup foundation
-- Adds trial context columns plus an atomic provisioning RPC for the public signup flow.

alter table public.trade_events
  add column if not exists booth_number text,
  add column if not exists trial_context jsonb not null default '{}'::jsonb;

alter table public.my_card_settings
  add column if not exists trade_show_context jsonb not null default '{}'::jsonb;

alter table public.leads
  add column if not exists trial_org_id uuid references public.organizations(id),
  add column if not exists signup_metadata jsonb not null default '{}'::jsonb,
  add column if not exists trade_show_name text,
  add column if not exists booth_number text,
  add column if not exists main_product_category text;

create unique index if not exists org_module_grants_organization_module_key_idx
  on public.org_module_grants(organization_id, module_key);

create table if not exists public.organization_trial_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trial_mode text not null default 'trade_show_trial',
  active_capabilities text[] not null default '{}',
  preview_capabilities text[] not null default '{}',
  allow_exports boolean not null default true,
  allow_premium boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, trial_mode)
);

alter table public.organization_trial_capabilities enable row level security;

drop policy if exists "organization_trial_capabilities_members_read" on public.organization_trial_capabilities;
create policy "organization_trial_capabilities_members_read"
  on public.organization_trial_capabilities
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_trial_capabilities.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );

create table if not exists public.trade_show_trial_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  trade_event_id uuid references public.trade_events(id) on delete set null,
  signup_email text not null,
  signup_phone text not null,
  full_name text not null,
  company_name text not null,
  trade_show_name text not null,
  booth_number text,
  main_product_category text,
  status text not null default 'trial_started',
  signup_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_show_trial_workspaces enable row level security;

drop policy if exists "trade_show_trial_workspaces_members_read" on public.trade_show_trial_workspaces;
create policy "trade_show_trial_workspaces_members_read"
  on public.trade_show_trial_workspaces
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = trade_show_trial_workspaces.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );

create or replace function public.provision_trade_show_trial_workspace(
  p_user_id uuid,
  p_full_name text,
  p_company text,
  p_email text,
  p_phone_whatsapp text,
  p_trade_show_name text,
  p_booth_number text default null,
  p_main_product_category text default null,
  p_org_slug text default null,
  p_signup_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_event_id uuid;
  v_membership_id uuid;
  v_owner_role_id uuid;
  v_card_id uuid;
  v_trial_id uuid;
  v_platform_org_id uuid;
  v_slug text;
  v_trade_context jsonb;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if nullif(trim(p_full_name), '') is null
    or nullif(trim(p_company), '') is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_phone_whatsapp), '') is null
    or nullif(trim(p_trade_show_name), '') is null then
    raise exception 'required trial signup fields are missing';
  end if;

  v_slug := lower(regexp_replace(coalesce(nullif(trim(p_org_slug), ''), trim(p_company)), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'trade-show-trial-' || substring(gen_random_uuid()::text from 1 for 8);
  end if;

  select id into v_platform_org_id
  from public.organizations
  where slug = 'setu-flow'
  order by created_at asc
  limit 1;

  v_trade_context := jsonb_build_object(
    'trial_mode', 'trade_show_trial',
    'trade_show_name', trim(p_trade_show_name),
    'booth_number', nullif(trim(coalesce(p_booth_number, '')), ''),
    'main_product_category', nullif(trim(coalesce(p_main_product_category, '')), ''),
    'signup_metadata', coalesce(p_signup_metadata, '{}'::jsonb)
  );

  insert into public.profiles (id, full_name, email, updated_at)
  values (p_user_id, trim(p_full_name), lower(trim(p_email)), now())
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    updated_at = now();

  insert into public.organizations (name, slug, default_currency, contact_email, created_by, updated_at)
  values (trim(p_company), v_slug, 'USD', lower(trim(p_email)), p_user_id, now())
  on conflict (slug) do update set
    name = excluded.name,
    contact_email = excluded.contact_email,
    updated_at = now()
  returning id into v_org_id;

  select id into v_membership_id
  from public.organization_members
  where organization_id = v_org_id and user_id = p_user_id and is_active = true
  limit 1;

  if v_membership_id is null then
    insert into public.organization_members (organization_id, user_id, is_active)
    values (v_org_id, p_user_id, true)
    returning id into v_membership_id;
  end if;

  select id into v_owner_role_id
  from public.roles
  where organization_id = v_org_id and name = 'owner'
  limit 1;

  if v_owner_role_id is null then
    insert into public.roles (organization_id, name, description)
    values (v_org_id, 'owner', 'Trial workspace owner with access to trade show capture setup.')
    returning id into v_owner_role_id;
  end if;

  if v_owner_role_id is not null and not exists (
    select 1 from public.user_roles where organization_member_id = v_membership_id and role_id = v_owner_role_id
  ) then
    insert into public.user_roles (organization_member_id, role_id)
    values (v_membership_id, v_owner_role_id);
  end if;

  select id into v_event_id
  from public.trade_events
  where organization_id = v_org_id and lower(name) = lower(trim(p_trade_show_name))
  order by created_at asc
  limit 1;

  if v_event_id is null then
    insert into public.trade_events (
      organization_id,
      name,
      booth_number,
      notes,
      capture_defaults,
      trial_context
    ) values (
      v_org_id,
      trim(p_trade_show_name),
      nullif(trim(coalesce(p_booth_number, '')), ''),
      'Created automatically from Instant Trade Show Trial signup.',
      jsonb_build_object(
        'default_product_label', nullif(trim(coalesce(p_main_product_category, '')), ''),
        'default_lead_type', 'buyer',
        'trial_mode', 'trade_show_trial'
      ),
      v_trade_context
    )
    returning id into v_event_id;
  else
    update public.trade_events
    set booth_number = coalesce(nullif(trim(coalesce(p_booth_number, '')), ''), booth_number),
        trial_context = coalesce(trial_context, '{}'::jsonb) || v_trade_context,
        updated_at = now()
    where id = v_event_id;
  end if;

  insert into public.my_card_settings (
    user_id,
    organization_id,
    share_slug,
    primary_phone,
    is_public,
    trade_show_context,
    updated_at
  ) values (
    p_user_id,
    v_org_id,
    lower(regexp_replace(trim(p_full_name || '-' || p_company), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text from 1 for 6),
    trim(p_phone_whatsapp),
    true,
    v_trade_context,
    timezone('utc', now())
  )
  on conflict (user_id) do update set
    primary_phone = coalesce(nullif(excluded.primary_phone, ''), public.my_card_settings.primary_phone),
    trade_show_context = excluded.trade_show_context,
    updated_at = timezone('utc', now())
  returning id into v_card_id;

  insert into public.client_entitlement_profiles (
    organization_id,
    managed_by_organization_id,
    plan_key,
    billing_status,
    onboarding_stage,
    seat_limit,
    guru_monthly_request_limit,
    guru_monthly_spend_limit,
    overage_policy,
    trial_ends_at,
    internal_notes,
    max_leads,
    max_quotes,
    max_orders,
    max_users,
    allow_exports,
    allow_invites,
    allow_settings_edit,
    allow_dispatch,
    guided_mode_enabled
  ) values (
    v_org_id,
    v_platform_org_id,
    'starter',
    'trial',
    'guided_trial',
    1,
    250,
    50,
    'block_at_limit',
    current_date + 14,
    'Trade Show Trial: signup, trade event setup, vCard context, and CSV export-ready trial capability foundation.',
    0,
    0,
    0,
    1,
    true,
    false,
    false,
    false,
    true
  )
  on conflict (organization_id) do update set
    managed_by_organization_id = excluded.managed_by_organization_id,
    billing_status = 'trial',
    onboarding_stage = 'guided_trial',
    seat_limit = 1,
    overage_policy = 'block_at_limit',
    allow_exports = true,
    allow_invites = false,
    allow_settings_edit = false,
    allow_dispatch = false,
    guided_mode_enabled = true,
    internal_notes = excluded.internal_notes,
    updated_at = now();

  insert into public.org_module_grants (organization_id, module_key, enabled, granted_by)
  values
    (v_org_id, 'trade_show', true, p_user_id),
    (v_org_id, 'vcard', true, p_user_id),
    (v_org_id, 'full_crm', false, p_user_id),
    (v_org_id, 'orders_compliance', false, p_user_id),
    (v_org_id, 'setu_guru', false, p_user_id),
    (v_org_id, 'analytics', false, p_user_id)
  on conflict (organization_id, module_key) do update set
    enabled = excluded.enabled,
    granted_by = excluded.granted_by,
    updated_at = now();

  insert into public.organization_trial_capabilities (
    organization_id,
    trial_mode,
    active_capabilities,
    preview_capabilities,
    allow_exports,
    allow_premium,
    metadata
  ) values (
    v_org_id,
    'trade_show_trial',
    array['signup', 'default_trade_event', 'vcard_context', 'csv_export_ready'],
    array['capture_type', 'capture_dictate', 'capture_scan', 'lead_command_center', 'quotes', 'orders', 'analytics'],
    true,
    false,
    v_trade_context
  )
  on conflict (organization_id, trial_mode) do update set
    active_capabilities = excluded.active_capabilities,
    preview_capabilities = excluded.preview_capabilities,
    allow_exports = true,
    allow_premium = false,
    metadata = excluded.metadata,
    updated_at = now();

  insert into public.trade_show_trial_workspaces (
    organization_id,
    user_id,
    trade_event_id,
    signup_email,
    signup_phone,
    full_name,
    company_name,
    trade_show_name,
    booth_number,
    main_product_category,
    signup_metadata
  ) values (
    v_org_id,
    p_user_id,
    v_event_id,
    lower(trim(p_email)),
    trim(p_phone_whatsapp),
    trim(p_full_name),
    trim(p_company),
    trim(p_trade_show_name),
    nullif(trim(coalesce(p_booth_number, '')), ''),
    nullif(trim(coalesce(p_main_product_category, '')), ''),
    coalesce(p_signup_metadata, '{}'::jsonb)
  )
  on conflict (organization_id) do update set
    user_id = excluded.user_id,
    trade_event_id = excluded.trade_event_id,
    signup_email = excluded.signup_email,
    signup_phone = excluded.signup_phone,
    full_name = excluded.full_name,
    company_name = excluded.company_name,
    trade_show_name = excluded.trade_show_name,
    booth_number = excluded.booth_number,
    main_product_category = excluded.main_product_category,
    signup_metadata = excluded.signup_metadata,
    updated_at = now()
  returning id into v_trial_id;

  insert into public.audit_logs (organization_id, actor_user_id, entity_type, entity_id, action, payload)
  values (
    v_org_id,
    p_user_id,
    'trade_show_trial_workspace',
    v_trial_id,
    'trade_show_trial_workspace_provisioned',
    v_trade_context
  );

  return jsonb_build_object(
    'organization_id', v_org_id,
    'trade_event_id', v_event_id,
    'membership_id', v_membership_id,
    'card_settings_id', v_card_id,
    'trial_workspace_id', v_trial_id,
    'workspace_path', '/trade-events?trial_started=1&mode=trade_show_trial'
  );
end;
$$;

grant execute on function public.provision_trade_show_trial_workspace(uuid, text, text, text, text, text, text, text, text, jsonb) to service_role;
