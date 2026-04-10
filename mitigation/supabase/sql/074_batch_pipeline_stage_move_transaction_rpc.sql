begin;

create or replace function public.app_batch_move_leads_stage_tx(
  p_organization_id uuid,
  p_lead_ids uuid[],
  p_stage_id uuid,
  p_actor_user_id uuid,
  p_occurred_at timestamptz default now()
)
returns table(
  lead_id uuid,
  stage_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_stage public.pipeline_stages%rowtype;
  v_missing_count integer;
  v_invalid_pipeline_count integer;
begin
  if coalesce(array_length(p_lead_ids, 1), 0) = 0 then
    raise exception 'Select at least one lead and a stage';
  end if;

  select *
  into v_target_stage
  from public.pipeline_stages
  where public.pipeline_stages.id = p_stage_id;

  if not found then
    raise exception 'Target stage not found';
  end if;

  select count(*)
  into v_missing_count
  from unnest(p_lead_ids) as requested_lead_id
  left join public.leads l
    on l.id = requested_lead_id
   and l.organization_id = p_organization_id
  where l.id is null;

  if v_missing_count > 0 then
    raise exception 'One or more selected leads are not available in the active organization';
  end if;

  select count(*)
  into v_invalid_pipeline_count
  from public.leads l
  where l.organization_id = p_organization_id
    and l.id = any(p_lead_ids)
    and (
      l.pipeline_id is null
      or l.pipeline_id is distinct from v_target_stage.pipeline_id
    );

  if v_invalid_pipeline_count > 0 then
    raise exception 'Cannot move leads into a stage from another pipeline';
  end if;

  perform 1
  from public.leads l
  where l.organization_id = p_organization_id
    and l.id = any(p_lead_ids)
  for update;

  create temporary table tmp_batch_stage_move
  on commit drop
  as
  select
    l.id as lead_id,
    l.company_name,
    l.stage_id as previous_stage_id
  from public.leads l
  where l.organization_id = p_organization_id
    and l.id = any(p_lead_ids);

  update public.leads l
  set
    stage_id = p_stage_id,
    updated_by = p_actor_user_id,
    updated_at = now()
  where l.organization_id = p_organization_id
    and l.id in (select lead_id from tmp_batch_stage_move);

  insert into public.lead_stage_history (
    organization_id,
    lead_id,
    from_stage_id,
    to_stage_id,
    changed_by,
    changed_at
  )
  select
    p_organization_id,
    m.lead_id,
    m.previous_stage_id,
    p_stage_id,
    p_actor_user_id,
    p_occurred_at
  from tmp_batch_stage_move m;

  insert into public.lead_activities (
    organization_id,
    lead_id,
    actor_user_id,
    kind,
    message,
    occurred_at
  )
  select
    p_organization_id,
    m.lead_id,
    p_actor_user_id,
    'stage_changed',
    format('%s moved to %s.', m.company_name, v_target_stage.name),
    p_occurred_at
  from tmp_batch_stage_move m;

  insert into public.communications (
    organization_id,
    lead_id,
    related_entity,
    related_id,
    communication_type,
    direction,
    channel,
    subject,
    body,
    summary,
    draft_source,
    status,
    sent_at,
    created_by,
    provider_payload,
    metadata
  )
  select
    p_organization_id,
    m.lead_id,
    'lead',
    m.lead_id,
    'system_note',
    'internal',
    'system',
    'Stage updated',
    format('%s moved to %s.', m.company_name, v_target_stage.name),
    'Pipeline stage changed',
    'system',
    'sent',
    p_occurred_at,
    p_actor_user_id,
    '{}'::jsonb,
    jsonb_build_object('source', 'batchMoveLeadsToStage', 'to_stage_id', p_stage_id)
  from tmp_batch_stage_move m;

  return query
  select
    l.id,
    l.stage_id,
    l.updated_at
  from public.leads l
  where l.organization_id = p_organization_id
    and l.id = any(p_lead_ids)
  order by l.id;
end;
$$;

commit;
