-- Sprint 31 post-merge production repair
-- Sync Trade Show Trial workspaces into client_onboarding_requests so /smc/leads
-- shows the same trial organizations that /smc/clients already sees.

create unique index if not exists client_onboarding_requests_linked_organization_unique_idx
  on public.client_onboarding_requests (linked_organization_id)
  where linked_organization_id is not null;

create or replace function public.sync_trade_show_trial_onboarding_request(p_organization_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
  v_inserted integer := 0;
begin
  with src as (
    select
      t.organization_id,
      t.company_name,
      coalesce(nullif(o.slug, ''), trim(both '-' from regexp_replace(lower(t.company_name), '[^a-z0-9]+', '-', 'g'))) as company_slug,
      coalesce(nullif(o.slug, ''), trim(both '-' from regexp_replace(lower(t.company_name), '[^a-z0-9]+', '-', 'g'))) || '.setuflowcrm.com' as workspace_domain,
      coalesce(o.logo_url, '/logos/setu-flow-logo.png') as logo_url,
      o.website,
      t.full_name,
      lower(t.signup_email) as signup_email,
      t.signup_phone,
      o.headquarters_country,
      t.trade_show_name,
      t.booth_number,
      t.main_product_category,
      t.created_at,
      'Trade Show Trial from ' || t.trade_show_name || coalesce(' booth ' || nullif(t.booth_number, ''), '') || '.' as trial_note
    from public.trade_show_trial_workspaces t
    join public.organizations o on o.id = t.organization_id
    where t.organization_id is not null
      and (p_organization_id is null or t.organization_id = p_organization_id)
  )
  update public.client_onboarding_requests cor
  set
    company_name = src.company_name,
    company_slug = src.company_slug,
    workspace_domain = src.workspace_domain,
    logo_url = src.logo_url,
    website = coalesce(src.website, cor.website),
    primary_admin_name = src.full_name,
    primary_admin_email = src.signup_email,
    primary_phone = src.signup_phone,
    headquarters_country = coalesce(src.headquarters_country, cor.headquarters_country),
    industry = coalesce(nullif(src.main_product_category, ''), cor.industry),
    requested_plan = case when cor.status = 'live' then cor.requested_plan else 'trial' end,
    requested_seat_count = greatest(coalesce(cor.requested_seat_count, 1), 1),
    is_trial_request = case when cor.status = 'live' then cor.is_trial_request else true end,
    trial_template_key = coalesce(nullif(cor.trial_template_key, ''), 'export_foods_basic'),
    requested_modules = case
      when coalesce(array_length(cor.requested_modules, 1), 0) = 0 then array['full_crm', 'trade_show']::text[]
      else cor.requested_modules
    end,
    pipeline_stage = case
      when cor.pipeline_stage in ('converted', 'negotiating') then cor.pipeline_stage
      else 'trial'
    end,
    lead_score = greatest(coalesce(cor.lead_score, 0), 70),
    status = case when cor.status = 'live' then 'live' else 'submitted' end,
    source = 'trade_show',
    source_detail = src.trade_show_name || coalesce(' / booth ' || nullif(src.booth_number, ''), ''),
    internal_notes = coalesce(cor.internal_notes, src.trial_note),
    additional_notes = coalesce(cor.additional_notes, src.trial_note),
    wants_trade_events = true,
    tags = (
      select array_agg(distinct tag)
      from unnest(coalesce(cor.tags, '{}'::text[]) || array['export_foods_basic', 'trial', 'trade_show']::text[]) as tag
      where tag is not null and tag <> ''
    ),
    updated_at = now()
  from src
  where cor.linked_organization_id = src.organization_id;

  get diagnostics v_updated = row_count;

  with src as (
    select
      t.organization_id,
      t.company_name,
      coalesce(nullif(o.slug, ''), trim(both '-' from regexp_replace(lower(t.company_name), '[^a-z0-9]+', '-', 'g'))) as company_slug,
      coalesce(nullif(o.slug, ''), trim(both '-' from regexp_replace(lower(t.company_name), '[^a-z0-9]+', '-', 'g'))) || '.setuflowcrm.com' as workspace_domain,
      coalesce(o.logo_url, '/logos/setu-flow-logo.png') as logo_url,
      o.website,
      t.full_name,
      lower(t.signup_email) as signup_email,
      t.signup_phone,
      o.headquarters_country,
      t.trade_show_name,
      t.booth_number,
      t.main_product_category,
      t.created_at,
      'Trade Show Trial from ' || t.trade_show_name || coalesce(' booth ' || nullif(t.booth_number, ''), '') || '.' as trial_note
    from public.trade_show_trial_workspaces t
    join public.organizations o on o.id = t.organization_id
    where t.organization_id is not null
      and (p_organization_id is null or t.organization_id = p_organization_id)
  )
  insert into public.client_onboarding_requests (
    company_name,
    company_slug,
    workspace_domain,
    logo_url,
    website,
    primary_admin_name,
    primary_admin_email,
    primary_phone,
    headquarters_country,
    requested_markets,
    requested_countries,
    requested_pipelines,
    requested_pipeline_stages,
    requested_next_steps,
    product_category_notes,
    additional_notes,
    wants_trade_events,
    status,
    linked_organization_id,
    created_at,
    updated_at,
    notification_status,
    requested_modules,
    requested_seat_count,
    is_trial_request,
    requested_plan,
    pipeline_stage,
    lead_score,
    source,
    source_detail,
    industry,
    internal_notes,
    tags,
    trial_template_key
  )
  select
    src.company_name,
    src.company_slug,
    src.workspace_domain,
    src.logo_url,
    src.website,
    src.full_name,
    src.signup_email,
    src.signup_phone,
    src.headquarters_country,
    '{}'::text[],
    '{}'::text[],
    array['Trade Show Trial']::text[],
    array['Trial Started', 'Engaged Lead', 'Converted']::text[],
    array['Review trial activity', 'Follow up on upgrade intent']::text[],
    src.main_product_category,
    src.trial_note,
    true,
    'submitted',
    src.organization_id,
    src.created_at,
    now(),
    'pending',
    array['full_crm', 'trade_show']::text[],
    1,
    true,
    'trial',
    'trial',
    70,
    'trade_show',
    src.trade_show_name || coalesce(' / booth ' || nullif(src.booth_number, ''), ''),
    src.main_product_category,
    src.trial_note,
    array['export_foods_basic', 'trial', 'trade_show']::text[],
    'export_foods_basic'
  from src
  where not exists (
    select 1
    from public.client_onboarding_requests existing
    where existing.linked_organization_id = src.organization_id
  );

  get diagnostics v_inserted = row_count;

  return v_updated + v_inserted;
end;
$$;

create or replace function public.sync_trade_show_trial_onboarding_request_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_trade_show_trial_onboarding_request(new.organization_id);
  return new;
end;
$$;

drop trigger if exists trade_show_trial_workspaces_sync_onboarding_request
  on public.trade_show_trial_workspaces;

create trigger trade_show_trial_workspaces_sync_onboarding_request
after insert or update of signup_email, signup_phone, full_name, company_name, trade_show_name, booth_number, main_product_category, signup_metadata, status
on public.trade_show_trial_workspaces
for each row
execute function public.sync_trade_show_trial_onboarding_request_trigger();

grant execute on function public.sync_trade_show_trial_onboarding_request(uuid) to service_role;

select public.sync_trade_show_trial_onboarding_request(null);
