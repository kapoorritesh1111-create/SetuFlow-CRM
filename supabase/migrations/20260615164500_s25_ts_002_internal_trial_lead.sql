-- Sprint 25 / S25-TS-002: Internal Setu Flow lead for every Trade Show Trial signup.
-- Extends the S25-TS-001 provisioning RPC so successful trial workspaces create or link
-- exactly one internal lead in the Setu Flow organization.

create unique index if not exists leads_trade_show_trial_org_unique_idx
  on public.leads (trial_org_id)
  where trial_org_id is not null;

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
  v_internal_org_id uuid;
  v_internal_pipeline_id uuid;
  v_internal_stage_id uuid;
  v_internal_lead_id uuid;
  v_slug text;
  v_trade_context jsonb;
  v_internal_lead_metadata jsonb;
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

  v_internal_org_id := v_platform_org_id;
  if v_internal_org_id is null then
    raise exception 'internal Setu Flow organization is not configured';
  end if;

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

  select id into v_internal_pipeline_id
  from public.pipelines
  where organization_id = v_internal_org_id
    and lower(name) = lower('Trade Show Trial')
  order by created_at asc
  limit 1;

  if v_internal_pipeline_id is null then
    insert into public.pipelines (organization_id, name, lead_type, is_default, updated_at)
    values (v_internal_org_id, 'Trade Show Trial', 'buyer', false, now())
    returning id into v_internal_pipeline_id;
  end if;

  select id into v_internal_stage_id
  from public.pipeline_stages
  where pipeline_id = v_internal_pipeline_id
    and lower(name) = lower('Trial Started')
  order by sort_order asc, created_at asc
  limit 1;

  if v_internal_stage_id is null then
    insert into public.pipeline_stages (pipeline_id, name, sort_order, color, updated_at)
    values (v_internal_pipeline_id, 'Trial Started', 10, '#108477', now())
    returning id into v_internal_stage_id;
  end if;

  v_internal_lead_metadata := coalesce(p_signup_metadata, '{}'::jsonb) || jsonb_build_object(
    'source', 'Trade Show Trial Signup',
    'status', 'Trial Started',
    'trial_org_id', v_org_id,
    'trial_workspace_id', v_trial_id,
    'trial_trade_event_id', v_event_id,
    'trade_show_name', trim(p_trade_show_name),
    'booth_number', nullif(trim(coalesce(p_booth_number, '')), ''),
    'main_product_category', nullif(trim(coalesce(p_main_product_category, '')), '')
  );

  select id into v_internal_lead_id
  from public.leads
  where organization_id = v_internal_org_id
    and trial_org_id = v_org_id
  order by created_at asc
  limit 1;

  if v_internal_lead_id is null then
    select id into v_internal_lead_id
    from public.leads
    where organization_id = v_internal_org_id
      and lower(coalesce(email, '')) = lower(trim(p_email))
      and lower(company_name) = lower(trim(p_company))
    order by created_at asc
    limit 1;
  end if;

  if v_internal_lead_id is null then
    insert into public.leads (
      organization_id,
      lead_type,
      company_name,
      contact_name,
      email,
      phone,
      whatsapp_number,
      product_type,
      products_or_needs,
      notes,
      pipeline_id,
      stage_id,
      source_type,
      source_label,
      trial_org_id,
      signup_metadata,
      trade_show_name,
      booth_number,
      main_product_category,
      updated_at
    ) values (
      v_internal_org_id,
      'buyer',
      trim(p_company),
      trim(p_full_name),
      lower(trim(p_email)),
      trim(p_phone_whatsapp),
      trim(p_phone_whatsapp),
      nullif(trim(coalesce(p_main_product_category, '')), ''),
      nullif(trim(coalesce(p_main_product_category, '')), ''),
      'Trial Started from ' || trim(p_trade_show_name) || coalesce(' booth ' || nullif(trim(coalesce(p_booth_number, '')), ''), '') || '.',
      v_internal_pipeline_id,
      v_internal_stage_id,
      'trade_show_trial_signup',
      'Trade Show Trial Signup',
      v_org_id,
      v_internal_lead_metadata,
      trim(p_trade_show_name),
      nullif(trim(coalesce(p_booth_number, '')), ''),
      nullif(trim(coalesce(p_main_product_category, '')), ''),
      now()
    )
    returning id into v_internal_lead_id;
  else
    update public.leads
    set trial_org_id = v_org_id,
        contact_name = coalesce(nullif(trim(p_full_name), ''), contact_name),
        email = coalesce(nullif(lower(trim(p_email)), ''), email),
        phone = coalesce(nullif(trim(p_phone_whatsapp), ''), phone),
        whatsapp_number = coalesce(nullif(trim(p_phone_whatsapp), ''), whatsapp_number),
        product_type = coalesce(nullif(trim(coalesce(p_main_product_category, '')), ''), product_type),
        products_or_needs = coalesce(nullif(trim(coalesce(p_main_product_category, '')), ''), products_or_needs),
        pipeline_id = v_internal_pipeline_id,
        stage_id = v_internal_stage_id,
        source_type = 'trade_show_trial_signup',
        source_label = 'Trade Show Trial Signup',
        signup_metadata = coalesce(signup_metadata, '{}'::jsonb) || v_internal_lead_metadata,
        trade_show_name = trim(p_trade_show_name),
        booth_number = nullif(trim(coalesce(p_booth_number, '')), ''),
        main_product_category = nullif(trim(coalesce(p_main_product_category, '')), ''),
        updated_at = now()
    where id = v_internal_lead_id;
  end if;

  insert into public.lead_activities (organization_id, lead_id, actor_user_id, kind, message, occurred_at)
  values (
    v_internal_org_id,
    v_internal_lead_id,
    null,
    'trade_show_trial_signup',
    'Trial Started from Trade Show Trial Signup for ' || trim(p_trade_show_name) || '.',
    now()
  );

  insert into public.audit_logs (organization_id, actor_user_id, entity_type, entity_id, action, payload)
  values (
    v_org_id,
    p_user_id,
    'trade_show_trial_workspace',
    v_trial_id,
    'trade_show_trial_workspace_provisioned',
    v_trade_context || jsonb_build_object('internal_lead_id', v_internal_lead_id)
  );

  return jsonb_build_object(
    'organization_id', v_org_id,
    'trade_event_id', v_event_id,
    'membership_id', v_membership_id,
    'card_settings_id', v_card_id,
    'trial_workspace_id', v_trial_id,
    'internal_lead_id', v_internal_lead_id,
    'workspace_path', '/trade-events?trial_started=1&mode=trade_show_trial'
  );
end;
$$;

grant execute on function public.provision_trade_show_trial_workspace(uuid, text, text, text, text, text, text, text, text, jsonb) to service_role;
