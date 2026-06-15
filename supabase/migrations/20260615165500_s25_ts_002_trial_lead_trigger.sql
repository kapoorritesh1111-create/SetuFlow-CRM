-- Sprint 25 / S25-TS-002: Internal Setu Flow lead for every successful Trade Show Trial signup.
-- Keeps the fix idempotent and scoped by reacting to created/updated trial workspace rows.

create unique index if not exists leads_trade_show_trial_org_unique_idx
  on public.leads (trial_org_id)
  where trial_org_id is not null;

create or replace function public.sync_trade_show_trial_internal_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_internal_org_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_lead_id uuid;
  v_metadata jsonb;
begin
  select id into v_internal_org_id
  from public.organizations
  where slug = 'setu-flow'
  order by created_at asc
  limit 1;

  if v_internal_org_id is null then
    raise exception 'internal Setu Flow organization is not configured';
  end if;

  select id into v_pipeline_id
  from public.pipelines
  where organization_id = v_internal_org_id
    and lower(name) = lower('Trade Show Trial')
  order by created_at asc
  limit 1;

  if v_pipeline_id is null then
    insert into public.pipelines (organization_id, name, lead_type, is_default, updated_at)
    values (v_internal_org_id, 'Trade Show Trial', 'buyer', false, now())
    returning id into v_pipeline_id;
  end if;

  select id into v_stage_id
  from public.pipeline_stages
  where pipeline_id = v_pipeline_id
    and lower(name) = lower('Trial Started')
  order by sort_order asc, created_at asc
  limit 1;

  if v_stage_id is null then
    insert into public.pipeline_stages (pipeline_id, name, sort_order, color, updated_at)
    values (v_pipeline_id, 'Trial Started', 10, '#108477', now())
    returning id into v_stage_id;
  end if;

  v_metadata := coalesce(NEW.signup_metadata, '{}'::jsonb) || jsonb_build_object(
    'source', 'Trade Show Trial Signup',
    'status', 'Trial Started',
    'trial_org_id', NEW.organization_id,
    'trial_workspace_id', NEW.id,
    'trial_trade_event_id', NEW.trade_event_id,
    'trade_show_name', NEW.trade_show_name,
    'booth_number', NEW.booth_number,
    'main_product_category', NEW.main_product_category
  );

  select id into v_lead_id
  from public.leads
  where organization_id = v_internal_org_id
    and trial_org_id = NEW.organization_id
  order by created_at asc
  limit 1;

  if v_lead_id is null then
    select id into v_lead_id
    from public.leads
    where organization_id = v_internal_org_id
      and lower(coalesce(email, '')) = lower(NEW.signup_email)
      and lower(company_name) = lower(NEW.company_name)
    order by created_at asc
    limit 1;
  end if;

  if v_lead_id is null then
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
      NEW.company_name,
      NEW.full_name,
      lower(NEW.signup_email),
      NEW.signup_phone,
      NEW.signup_phone,
      NEW.main_product_category,
      NEW.main_product_category,
      'Trial Started from ' || NEW.trade_show_name || coalesce(' booth ' || nullif(NEW.booth_number, ''), '') || '.',
      v_pipeline_id,
      v_stage_id,
      'trade_show_trial_signup',
      'Trade Show Trial Signup',
      NEW.organization_id,
      v_metadata,
      NEW.trade_show_name,
      NEW.booth_number,
      NEW.main_product_category,
      now()
    )
    returning id into v_lead_id;
  else
    update public.leads
    set trial_org_id = NEW.organization_id,
        contact_name = coalesce(nullif(NEW.full_name, ''), contact_name),
        email = coalesce(nullif(lower(NEW.signup_email), ''), email),
        phone = coalesce(nullif(NEW.signup_phone, ''), phone),
        whatsapp_number = coalesce(nullif(NEW.signup_phone, ''), whatsapp_number),
        product_type = coalesce(nullif(NEW.main_product_category, ''), product_type),
        products_or_needs = coalesce(nullif(NEW.main_product_category, ''), products_or_needs),
        pipeline_id = v_pipeline_id,
        stage_id = v_stage_id,
        source_type = 'trade_show_trial_signup',
        source_label = 'Trade Show Trial Signup',
        signup_metadata = coalesce(signup_metadata, '{}'::jsonb) || v_metadata,
        trade_show_name = NEW.trade_show_name,
        booth_number = NEW.booth_number,
        main_product_category = NEW.main_product_category,
        updated_at = now()
    where id = v_lead_id;
  end if;

  insert into public.lead_activities (organization_id, lead_id, actor_user_id, kind, message, occurred_at)
  values (
    v_internal_org_id,
    v_lead_id,
    null,
    'trade_show_trial_signup',
    'Trial Started from Trade Show Trial Signup for ' || NEW.trade_show_name || '.',
    now()
  );

  return NEW;
end;
$$;

drop trigger if exists trade_show_trial_workspaces_sync_internal_lead
  on public.trade_show_trial_workspaces;

create trigger trade_show_trial_workspaces_sync_internal_lead
after insert or update of signup_email, signup_phone, full_name, company_name, trade_show_name, booth_number, main_product_category, signup_metadata
on public.trade_show_trial_workspaces
for each row
execute function public.sync_trade_show_trial_internal_lead();
