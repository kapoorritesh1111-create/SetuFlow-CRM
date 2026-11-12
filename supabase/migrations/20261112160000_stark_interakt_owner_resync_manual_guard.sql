-- Reconcile an explicit, changed Interakt contact owner without overriding SETU manual assignment.
-- INSERT ownership and IndiaMART routing continue using their existing trigger.
create or replace function public.sync_stark_interakt_owner_on_change()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_name text;
  v_choice record;
begin
  if new.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    or lower(coalesce(new.source_provider,'')) <> 'interakt'
    or new.qualified_lead_id is not null
    or new.setu_assignment_origin not in ('interakt','setu_auto')
  then return new; end if;

  -- Historical manual reassignments were previously mislabeled 'interakt'.
  -- Protect those as well as all new explicit 'manual' owner changes.
  if exists (
    select 1 from public.audit_logs a
    where a.organization_id = new.organization_id
      and a.entity_id = new.id
      and a.action = 'inbound_lead_reassigned'
  ) then return new; end if;

  v_name := lower(regexp_replace(btrim(coalesce(new.interakt_assignee_name,'')), '[[:space:]]+', ' ', 'g'));
  if v_name = '' then return new; end if;

  select om.user_id, lower(p.email) as email,
         coalesce(nullif(p.full_name,''),p.email) as display_name into v_choice
  from public.organization_members om
  join public.profiles p on p.id=om.user_id
  join public.user_roles ur on ur.organization_member_id=om.id
  join public.roles r on r.id=ur.role_id
  where om.organization_id=new.organization_id and om.is_active
    and lower(r.name) in ('sales','field_sales')
    and lower(p.email) not like 'support@%'
    and (
      v_name = lower(regexp_replace(btrim(coalesce(p.full_name,'')), '[[:space:]]+', ' ', 'g'))
      or v_name = lower(p.email)
      or (v_name='simran simran' and lower(p.email)='cse@starkpackmate.com')
    )
  order by p.full_name limit 1;

  if v_choice.user_id is null or v_choice.user_id = new.setu_assigned_user_id then return new; end if;

  insert into public.audit_logs (organization_id, entity_type, entity_id, action, payload)
  values (new.organization_id,'lead_intake_staging',new.id,'interakt_owner_synced',
     jsonb_build_object('previous_user_id',new.setu_assigned_user_id,
                        'next_user_id',v_choice.user_id,
                        'provider_assignee',new.interakt_assignee_name));

  new.setu_assigned_user_id := v_choice.user_id;
  new.setu_assigned_invitation_id := null;
  new.setu_assigned_email := v_choice.email;
  new.setu_assigned_name := v_choice.display_name;
  new.setu_assigned_at := now();
  new.setu_assignment_origin := 'interakt';
  return new;
end;
$$;

drop trigger if exists trg_sync_stark_interakt_owner_on_change on public.lead_intake_staging;
create trigger trg_sync_stark_interakt_owner_on_change
before update of interakt_assignee_name on public.lead_intake_staging
for each row
when (old.interakt_assignee_name is distinct from new.interakt_assignee_name)
execute function public.sync_stark_interakt_owner_on_change();
