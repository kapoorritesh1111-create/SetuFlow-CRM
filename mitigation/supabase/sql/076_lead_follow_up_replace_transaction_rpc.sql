begin;

create or replace function public.app_replace_lead_follow_up_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_scheduled_at timestamptz,
  p_actor_user_id uuid default null
)
returns table(
  id uuid,
  lead_id uuid,
  scheduled_at timestamptz,
  status text
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

  delete from public.lead_follow_ups
  where public.lead_follow_ups.organization_id = p_organization_id
    and public.lead_follow_ups.lead_id = p_lead_id
    and public.lead_follow_ups.status <> 'completed';

  return query
  insert into public.lead_follow_ups (
    organization_id,
    lead_id,
    assigned_user_id,
    scheduled_at,
    status,
    created_by
  )
  values (
    p_organization_id,
    p_lead_id,
    v_lead.owner_user_id,
    p_scheduled_at,
    'scheduled',
    p_actor_user_id
  )
  returning
    public.lead_follow_ups.id,
    public.lead_follow_ups.lead_id,
    public.lead_follow_ups.scheduled_at,
    public.lead_follow_ups.status;
end;
$$;

commit;
