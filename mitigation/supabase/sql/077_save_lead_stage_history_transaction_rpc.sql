begin;

create or replace function public.app_record_save_lead_stage_history_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_from_stage_id uuid,
  p_to_stage_id uuid,
  p_actor_user_id uuid default null
)
returns table(
  lead_id uuid,
  from_stage_id uuid,
  to_stage_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
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
    raise exception 'Stage history requires an actual stage change';
  end if;

  if v_lead.stage_id is distinct from p_to_stage_id then
    raise exception 'Lead current stage does not match the requested to_stage_id';
  end if;

  insert into public.lead_stage_history (
    organization_id,
    lead_id,
    from_stage_id,
    to_stage_id,
    changed_by,
    note
  )
  values (
    p_organization_id,
    p_lead_id,
    p_from_stage_id,
    p_to_stage_id,
    p_actor_user_id,
    null
  );

  return query
  select p_lead_id, p_from_stage_id, p_to_stage_id;
end;
$$;

commit;
