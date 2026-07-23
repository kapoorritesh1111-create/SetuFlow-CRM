-- Sprint 48 Growth Center completion (S48-GROWTH-011 through S48-GROWTH-015)
-- Reconciliation note: live project sjzfzloggabsmcuxktnl already carries reviewer/verification/
-- approval/conversion lifecycle columns on external_opportunities and confidence/verification
-- columns on external_opportunity_contacts that were applied ahead of this repository (no prior
-- migration file recorded them). The "add column if not exists" blocks below are safe no-ops
-- against the live database and exist only to bring supabase/migrations/ back in sync with the
-- live schema so future fresh-database bootstraps match production.

-- 1. Reconcile external_opportunities lifecycle columns (safe no-op live; needed for fresh installs)
alter table public.external_opportunities
  add column if not exists reviewer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists review_note text,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists outreach_ready_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_by uuid references auth.users(id) on delete set null,
  add column if not exists converted_lead_type text;

alter table public.external_opportunities
  drop constraint if exists external_opportunities_converted_lead_type_check;
alter table public.external_opportunities
  add constraint external_opportunities_converted_lead_type_check
  check (converted_lead_type is null or converted_lead_type in ('buyer', 'supplier'));

alter table public.external_opportunities
  drop constraint if exists external_opportunities_review_status_check;
alter table public.external_opportunities
  add constraint external_opportunities_review_status_check
  check (review_status in ('new','reviewing','verified','rejected','approved','outreach_ready','converted','dismissed','archived'));

-- 2. Reconcile external_opportunity_contacts columns (safe no-op live)
alter table public.external_opportunity_contacts
  add column if not exists confidence integer,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.external_opportunity_contacts
  drop constraint if exists external_opportunity_contacts_confidence_check;
alter table public.external_opportunity_contacts
  add constraint external_opportunity_contacts_confidence_check
  check (confidence is null or (confidence between 0 and 100));

-- 3. Link outreach drafts stored in the existing communications table to external opportunities.
alter table public.communications
  add column if not exists external_opportunity_id uuid references public.external_opportunities(id) on delete set null;

alter table public.communications
  drop constraint if exists communications_related_entity_check;
alter table public.communications
  add constraint communications_related_entity_check
  check (related_entity = any (array['lead','quote','rfq','trade_event_entry','external_opportunity','other']));

create index if not exists communications_external_opportunity_idx
  on public.communications (organization_id, external_opportunity_id)
  where external_opportunity_id is not null;

-- 4. Additional lookup indexes for dashboard metrics and verification/duplicate filtering.
create index if not exists external_opportunities_verification_idx
  on public.external_opportunities (org_id, verification_state, review_status);

create index if not exists external_opportunities_company_type_idx
  on public.external_opportunities (org_id, company_type);

create index if not exists external_discovery_jobs_org_updated_idx
  on public.external_discovery_jobs (org_id, updated_at desc);

-- 5. Atomic, idempotent conversion of an approved external opportunity into a CRM lead.
-- Idempotency: if the opportunity already has converted_lead_id set, returns the existing lead
-- and does not insert a duplicate lead or history row.
create or replace function public.app_convert_external_opportunity_to_lead(
  p_org_id uuid,
  p_opportunity_id uuid,
  p_lead_type text,
  p_actor_user_id uuid
)
returns table(lead_id uuid, already_converted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opportunity record;
  v_lead_id uuid;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'Not authorized for this organization.';
  end if;

  if p_lead_type not in ('buyer', 'supplier') then
    raise exception 'lead_type must be buyer or supplier.';
  end if;

  select * into v_opportunity
  from public.external_opportunities
  where id = p_opportunity_id and org_id = p_org_id
  for update;

  if not found then
    raise exception 'External opportunity was not found for this organization.';
  end if;

  if v_opportunity.converted_lead_id is not null then
    return query select v_opportunity.converted_lead_id, true;
    return;
  end if;

  if v_opportunity.review_status not in ('approved', 'outreach_ready') then
    raise exception 'Opportunity must be approved before conversion. Current status: %', v_opportunity.review_status;
  end if;

  insert into public.leads (
    organization_id, company_name, country, lead_type,
    products_or_needs, website, source_type, source_label, created_by
  ) values (
    p_org_id, v_opportunity.company_name, v_opportunity.country, p_lead_type,
    null, v_opportunity.website_url, 'external_discovery',
    concat('External Discovery: ', v_opportunity.source_label), p_actor_user_id
  )
  returning id into v_lead_id;

  update public.external_opportunities
  set converted_lead_id = v_lead_id,
      converted_at = now(),
      converted_by = p_actor_user_id,
      converted_lead_type = p_lead_type,
      review_status = 'converted',
      updated_at = now()
  where id = p_opportunity_id and org_id = p_org_id;

  insert into public.external_opportunity_history (org_id, opportunity_id, action, details, actor_user_id)
  values (
    p_org_id, p_opportunity_id, 'convert_to_lead',
    jsonb_build_object('lead_id', v_lead_id, 'lead_type', p_lead_type, 'previous_status', v_opportunity.review_status),
    p_actor_user_id
  );

  return query select v_lead_id, false;
end;
$$;

grant execute on function public.app_convert_external_opportunity_to_lead(uuid, uuid, text, uuid) to authenticated;

comment on function public.app_convert_external_opportunity_to_lead is
  'S48-GROWTH-020: idempotent, organization-scoped conversion of an approved external opportunity into a CRM buyer/supplier lead. Returns the existing lead on repeat calls instead of creating duplicates.';
