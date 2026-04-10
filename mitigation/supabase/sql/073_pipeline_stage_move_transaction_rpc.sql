begin;

create or replace function public.app_move_lead_stage_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_stage_id uuid,
  p_actor_user_id uuid,
  p_occurred_at timestamptz default now()
)
returns table(
  id uuid,
  stage_id uuid,
  updated_at timestamptz,
  previous_stage_id uuid,
  company_name text,
  stage_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_lead public.leads%rowtype;
  v_target_stage public.pipeline_stages%rowtype;
begin
  select *
  into v_current_lead
  from public.leads
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for the active organization';
  end if;

  select *
  into v_target_stage
  from public.pipeline_stages
  where public.pipeline_stages.id = p_stage_id;

  if not found then
    raise exception 'Target stage not found';
  end if;

  if v_current_lead.pipeline_id is null then
    raise exception 'Lead does not have a pipeline assigned yet';
  end if;

  if v_target_stage.pipeline_id is distinct from v_current_lead.pipeline_id then
    raise exception 'Cannot move a lead into a stage from another pipeline';
  end if;

  update public.leads
  set
    stage_id = p_stage_id,
    updated_by = p_actor_user_id,
    updated_at = now()
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id;

  insert into public.lead_stage_history (
    organization_id,
    lead_id,
    from_stage_id,
    to_stage_id,
    changed_by,
    changed_at
  )
  values (
    p_organization_id,
    p_lead_id,
    v_current_lead.stage_id,
    p_stage_id,
    p_actor_user_id,
    p_occurred_at
  );

  insert into public.lead_activities (
    organization_id,
    lead_id,
    actor_user_id,
    kind,
    message,
    occurred_at
  )
  values (
    p_organization_id,
    p_lead_id,
    p_actor_user_id,
    'stage_changed',
    format('%s moved to %s.', v_current_lead.company_name, v_target_stage.name),
    p_occurred_at
  );

  return query
  select
    v_current_lead.id,
    p_stage_id,
    l.updated_at,
    v_current_lead.stage_id,
    v_current_lead.company_name,
    v_target_stage.name
  from public.leads l
  where l.id = p_lead_id
    and l.organization_id = p_organization_id;
end;
$$;

commit;
