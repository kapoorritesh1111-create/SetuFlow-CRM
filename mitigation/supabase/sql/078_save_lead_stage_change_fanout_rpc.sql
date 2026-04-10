begin;

create or replace function public.app_record_save_lead_stage_change_fanout_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_from_stage_id uuid,
  p_to_stage_id uuid,
  p_actor_user_id uuid,
  p_company_name text
)
returns table(
  lead_id uuid,
  activity_kind text,
  communication_subject text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_has_stage_history boolean;
  v_now timestamptz := now();
begin
  select *
  into v_lead
  from public.leads
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for the active organization';
  end if;

  if p_from_stage_id is null or p_to_stage_id is null then
    raise exception 'Both from_stage_id and to_stage_id are required';
  end if;

  if p_from_stage_id = p_to_stage_id then
    raise exception 'Stage change fan-out requires an actual stage change';
  end if;

  select exists(
    select 1
    from public.lead_stage_history
    where organization_id = p_organization_id
      and lead_id = p_lead_id
      and from_stage_id = p_from_stage_id
      and to_stage_id = p_to_stage_id
  )
  into v_has_stage_history;

  if not v_has_stage_history then
    raise exception 'Stage-change fan-out requires an existing lead_stage_history row';
  end if;

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
    format('%s stage was updated.', p_company_name),
    v_now
  );

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
  values (
    p_organization_id,
    p_lead_id,
    'lead',
    p_lead_id,
    'system_note',
    'internal',
    'system',
    'Stage updated',
    format('%s stage was updated.', p_company_name),
    'Pipeline stage changed',
    'system',
    'sent',
    v_now,
    p_actor_user_id,
    '{}'::jsonb,
    jsonb_build_object(
      'source', 'saveLead',
      'from_stage_id', p_from_stage_id,
      'to_stage_id', p_to_stage_id
    )
  );

  return query
  select p_lead_id, 'stage_changed'::text, 'Stage updated'::text;
end;
$$;

commit;
