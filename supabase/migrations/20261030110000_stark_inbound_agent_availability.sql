-- Reuse chat's online heartbeat; allocate only unowned Interakt records with
-- no named provider assignee. Serializes allocation by organization.
create or replace function public.stark_assign_online_unowned_interakt(p_intake_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org constant uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_owner uuid;
  v_name text;
  v_email text;
begin
  -- The caller is the service-role webhook. Refuse arbitrary account access.
  if current_user <> 'service_role' then
    raise exception 'service role required';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org::text), 7130);
  perform 1 from public.lead_intake_staging s
  where s.id = p_intake_id and s.organization_id = v_org for update;
  if not found then return null; end if;

  -- All checks are repeated inside the same transaction after acquiring lock.
  if not exists (
    select 1 from public.lead_intake_staging s
    where s.id = p_intake_id and s.organization_id = v_org
      and s.source_provider = 'interakt'
      and nullif(btrim(s.interakt_assignee_name), '') is null
      and s.setu_assigned_user_id is null
      and s.setu_assigned_invitation_id is null
      and nullif(btrim(s.setu_assigned_email), '') is null
      and s.qualified_lead_id is null
      and coalesce(s.sales_queue_suppressed,false) = false
  ) then return null; end if;

  select om.user_id, coalesce(nullif(p.full_name,''),p.email), lower(p.email)
    into v_owner,v_name,v_email
  from public.organization_members om
  join public.profiles p on p.id=om.user_id
  join public.chat_presence cp on cp.user_id=om.user_id and cp.organization_id=om.organization_id
  where om.organization_id=v_org and om.is_active=true
    and coalesce(om.is_internal_support,false)=false
    and lower(coalesce(p.email,'')) not like 'support@%'
    and cp.status='online'
    and cp.last_seen_at > now()-interval '2 minutes'
    and exists (
      select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
      where ur.organization_member_id=om.id and lower(r.name)='sales'
    )
  order by (
    select count(*) from public.lead_intake_staging s
    where s.organization_id=v_org and s.setu_assigned_user_id=om.user_id
      and s.source_provider='interakt'
      and s.setu_assigned_at >= date_trunc('day',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'
  ) asc, om.user_id asc
  limit 1;

  if v_owner is null then return null; end if;
  update public.lead_intake_staging s
  set setu_assigned_user_id=v_owner, setu_assigned_invitation_id=null,
      setu_assigned_email=v_email,setu_assigned_name=v_name,setu_assigned_at=now()
  where s.id=p_intake_id and s.organization_id=v_org
    and s.setu_assigned_user_id is null and s.setu_assigned_invitation_id is null
    and nullif(btrim(s.setu_assigned_email),'') is null
    and nullif(btrim(s.interakt_assignee_name),'') is null;
  if found then return v_owner; end if;
  return null;
end;
$$;
revoke all on function public.stark_assign_online_unowned_interakt(uuid) from public,anon,authenticated;
grant execute on function public.stark_assign_online_unowned_interakt(uuid) to service_role;
