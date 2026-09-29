-- Stark Packmate ownership lock hotfix.
-- System integrations may assign only on initial inbound INSERT.
-- After an inbound or CRM lead has an owner, only explicit Owner/Admin actions may reassign it.

do $$
declare
  v_anita_user_id uuid;
begin
  select om.user_id
    into v_anita_user_id
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  join public.user_roles ur on ur.organization_member_id = om.id
  join public.roles r on r.id = ur.role_id
  where om.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and om.is_active = true
    and lower(p.email) = 'anita.singh@starkpackmate.com'
    and lower(r.name) in ('sales','field_sales')
  limit 1;

  if v_anita_user_id is null then
    raise exception 'Active Stark Packmate Sales user Anita Singh was not found';
  end if;

  update public.integrations
  set configuration = jsonb_set(
        coalesce(configuration, '{}'::jsonb),
        '{default_sales_assignee_user_id}',
        to_jsonb(v_anita_user_id::text),
        true
      ),
      updated_at = now()
  where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and lower(provider) = 'indiamart';
end
$$;

create or replace function public.assign_stark_inbound_sales_owner()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_choice record;
  v_interakt_name text;
  v_provider text := lower(coalesce(new.source_provider, ''));
begin
  if new.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     or v_provider not in ('interakt', 'indiamart') then
    return new;
  end if;

  if new.setu_assigned_user_id is not null
     or new.setu_assigned_invitation_id is not null
     or nullif(btrim(new.setu_assigned_email), '') is not null then
    return new;
  end if;

  if v_provider = 'indiamart' then
    select om.user_id,
           null::uuid as invitation_id,
           lower(p.email) as email,
           coalesce(nullif(p.full_name, ''), p.email) as display_name
      into v_choice
    from public.integrations i
    join public.organization_members om
      on om.organization_id = i.organization_id
     and om.user_id::text = nullif(i.configuration ->> 'default_sales_assignee_user_id', '')
     and om.is_active = true
    join public.user_roles ur on ur.organization_member_id = om.id
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = om.user_id
    where i.organization_id = new.organization_id
      and lower(i.provider) = 'indiamart'
      and lower(r.name) in ('sales','field_sales')
      and lower(coalesce(p.email, '')) not like 'support@%'
    order by p.full_name nulls last, p.email
    limit 1;

    if v_choice.user_id is null then
      select om.user_id,
             null::uuid as invitation_id,
             lower(p.email) as email,
             coalesce(nullif(p.full_name, ''), p.email) as display_name
        into v_choice
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      join public.profiles p on p.id = om.user_id
      where om.organization_id = new.organization_id
        and om.is_active = true
        and lower(p.email) = 'anita.singh@starkpackmate.com'
        and lower(r.name) in ('sales','field_sales')
      limit 1;
    end if;

    if v_choice.user_id is not null then
      new.setu_assigned_user_id := v_choice.user_id;
      new.setu_assigned_invitation_id := null;
      new.setu_assigned_email := v_choice.email;
      new.setu_assigned_name := v_choice.display_name;
      new.setu_assigned_at := now();
      return new;
    end if;
  end if;

  if v_provider = 'interakt' then
    v_interakt_name := lower(regexp_replace(btrim(coalesce(new.interakt_assignee_name, '')), '\s+', ' ', 'g'));

    if v_interakt_name <> '' then
      select om.user_id,
             null::uuid as invitation_id,
             lower(p.email) as email,
             coalesce(nullif(p.full_name, ''), p.email) as display_name
        into v_choice
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      join public.profiles p on p.id = om.user_id
      where om.organization_id = new.organization_id
        and om.is_active = true
        and lower(r.name) in ('sales','field_sales')
        and lower(coalesce(p.email, '')) not like 'support@%'
        and (
          v_interakt_name = lower(regexp_replace(btrim(coalesce(p.full_name, '')), '\s+', ' ', 'g'))
          or v_interakt_name like lower(regexp_replace(btrim(coalesce(p.full_name, '')), '\s+', ' ', 'g')) || ' %'
        )
      order by
        case when v_interakt_name = lower(regexp_replace(btrim(coalesce(p.full_name, '')), '\s+', ' ', 'g')) then 0 else 1 end,
        p.full_name
      limit 1;

      if v_choice.user_id is not null then
        new.setu_assigned_user_id := v_choice.user_id;
        new.setu_assigned_invitation_id := null;
        new.setu_assigned_email := v_choice.email;
        new.setu_assigned_name := v_choice.display_name;
        new.setu_assigned_at := now();
        return new;
      end if;
    end if;
  end if;

  select candidate.user_id, candidate.invitation_id, candidate.email, candidate.display_name
    into v_choice
  from (
    select om.user_id,
           null::uuid as invitation_id,
           lower(p.email) as email,
           coalesce(nullif(p.full_name, ''), p.email) as display_name
    from public.organization_members om
    join public.user_roles ur on ur.organization_member_id = om.id
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = om.user_id
    where om.organization_id = new.organization_id
      and om.is_active = true
      and lower(r.name) = 'sales'
      and lower(coalesce(p.email, '')) not like 'support@%'

    union all

    select null::uuid as user_id,
           oi.id as invitation_id,
           lower(oi.email) as email,
           coalesce(nullif(oi.metadata -> 'invitee' ->> 'full_name', ''), oi.email) as display_name
    from public.organization_invitations oi
    join public.roles r on r.id = oi.role_id
    where oi.organization_id = new.organization_id
      and oi.status in ('pending', 'sent')
      and lower(r.name) = 'sales'
      and lower(coalesce(oi.email, '')) not like 'support@%'
      and not exists (
        select 1
        from public.organization_members active_member
        join public.profiles active_profile on active_profile.id = active_member.user_id
        where active_member.organization_id = oi.organization_id
          and active_member.is_active = true
          and lower(active_profile.email) = lower(oi.email)
      )
  ) candidate
  order by md5(coalesce(new.external_contact_id::text, new.id::text) || ':' || coalesce(candidate.user_id::text, candidate.invitation_id::text))
  limit 1;

  if v_choice.user_id is not null or v_choice.invitation_id is not null then
    new.setu_assigned_user_id := v_choice.user_id;
    new.setu_assigned_invitation_id := v_choice.invitation_id;
    new.setu_assigned_email := v_choice.email;
    new.setu_assigned_name := v_choice.display_name;
    new.setu_assigned_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_stark_inbound_sales_owner on public.lead_intake_staging;
create trigger trg_assign_stark_inbound_sales_owner
before insert on public.lead_intake_staging
for each row
execute function public.assign_stark_inbound_sales_owner();

drop trigger if exists trg_resolve_stark_inbound_assignment_for_member on public.organization_members;
drop trigger if exists trg_sync_stark_inbound_qualified_lead_owner on public.lead_intake_staging;

with anita as (
  select om.user_id,
         lower(p.email) as email,
         coalesce(nullif(p.full_name, ''), p.email) as display_name
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  join public.user_roles ur on ur.organization_member_id = om.id
  join public.roles r on r.id = ur.role_id
  where om.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and om.is_active = true
    and lower(p.email) = 'anita.singh@starkpackmate.com'
    and lower(r.name) in ('sales','field_sales')
  limit 1
)
update public.lead_intake_staging s
set setu_assigned_user_id = a.user_id,
    setu_assigned_invitation_id = null,
    setu_assigned_email = a.email,
    setu_assigned_name = a.display_name,
    setu_assigned_at = now(),
    updated_at = now()
from anita a
where s.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and lower(s.source_provider) = 'indiamart'
  and s.sales_queue_suppressed = false
  and s.qualified_lead_id is null
  and s.intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored');
