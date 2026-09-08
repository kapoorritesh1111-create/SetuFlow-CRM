-- Stark Packmate inbound lead ownership and visibility.
-- Active Sales members and pending/sent Sales invitations participate in assignment.
-- Owners/admins/managers can see all Stark Interakt inbound leads; Sales users see assigned leads.

alter table public.lead_intake_staging
  add column if not exists setu_assigned_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists setu_assigned_invitation_id uuid references public.organization_invitations(id) on delete set null,
  add column if not exists setu_assigned_email text,
  add column if not exists setu_assigned_name text,
  add column if not exists setu_assigned_at timestamp with time zone;

create index if not exists lead_intake_staging_setu_assigned_user_idx
  on public.lead_intake_staging (organization_id, setu_assigned_user_id)
  where setu_assigned_user_id is not null;

create index if not exists lead_intake_staging_setu_assigned_email_idx
  on public.lead_intake_staging (organization_id, lower(setu_assigned_email))
  where setu_assigned_email is not null;

create or replace function public.assign_stark_inbound_sales_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_choice record;
begin
  if new.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     or lower(coalesce(new.source_provider, '')) <> 'interakt' then
    return new;
  end if;

  if new.setu_assigned_user_id is not null
     or new.setu_assigned_invitation_id is not null
     or nullif(btrim(new.setu_assigned_email), '') is not null then
    return new;
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
      and not exists (
        select 1
        from public.organization_members active_member
        join public.profiles active_profile on active_profile.id = active_member.user_id
        where active_member.organization_id = oi.organization_id
          and active_member.is_active = true
          and lower(active_profile.email) = lower(oi.email)
      )
  ) candidate
  order by random()
  limit 1;

  if v_choice.user_id is not null or v_choice.invitation_id is not null then
    new.setu_assigned_user_id := v_choice.user_id;
    new.setu_assigned_invitation_id := v_choice.invitation_id;
    new.setu_assigned_email := v_choice.email;
    new.setu_assigned_name := v_choice.display_name;
    new.setu_assigned_at := coalesce(new.setu_assigned_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_stark_inbound_sales_owner on public.lead_intake_staging;
create trigger trg_assign_stark_inbound_sales_owner
before insert on public.lead_intake_staging
for each row
execute function public.assign_stark_inbound_sales_owner();

-- Backfill existing actionable Stark Interakt rows across the current eligible Sales pool.
with eligible as (
  select om.organization_id,
         om.user_id,
         null::uuid as invitation_id,
         lower(p.email) as email,
         coalesce(nullif(p.full_name, ''), p.email) as display_name,
         'user:' || om.user_id::text as assignment_key
  from public.organization_members om
  join public.user_roles ur on ur.organization_member_id = om.id
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = om.user_id
  where om.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and om.is_active = true
    and lower(r.name) = 'sales'

  union all

  select oi.organization_id,
         null::uuid as user_id,
         oi.id as invitation_id,
         lower(oi.email) as email,
         coalesce(nullif(oi.metadata -> 'invitee' ->> 'full_name', ''), oi.email) as display_name,
         'invite:' || oi.id::text as assignment_key
  from public.organization_invitations oi
  join public.roles r on r.id = oi.role_id
  where oi.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and oi.status in ('pending', 'sent')
    and lower(r.name) = 'sales'
    and not exists (
      select 1
      from public.organization_members active_member
      join public.profiles active_profile on active_profile.id = active_member.user_id
      where active_member.organization_id = oi.organization_id
        and active_member.is_active = true
        and lower(active_profile.email) = lower(oi.email)
    )
), picked as (
  select s.id,
         chosen.user_id,
         chosen.invitation_id,
         chosen.email,
         chosen.display_name
  from public.lead_intake_staging s
  join lateral (
    select e.user_id, e.invitation_id, e.email, e.display_name
    from eligible e
    where e.organization_id = s.organization_id
    order by md5(s.id::text || ':' || e.assignment_key)
    limit 1
  ) chosen on true
  where s.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and s.source_provider = 'interakt'
    and s.sales_queue_suppressed = false
    and s.intake_status not in ('qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored')
    and s.setu_assigned_user_id is null
    and s.setu_assigned_invitation_id is null
    and nullif(btrim(s.setu_assigned_email), '') is null
)
update public.lead_intake_staging s
set setu_assigned_user_id = picked.user_id,
    setu_assigned_invitation_id = picked.invitation_id,
    setu_assigned_email = picked.email,
    setu_assigned_name = picked.display_name,
    setu_assigned_at = now()
from picked
where s.id = picked.id;

create or replace function public.resolve_stark_inbound_assignment_for_member()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  if new.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     or new.is_active is not true then
    return new;
  end if;

  select lower(p.email), coalesce(nullif(p.full_name, ''), p.email)
    into v_email, v_name
  from public.profiles p
  where p.id = new.user_id;

  if nullif(v_email, '') is null then
    return new;
  end if;

  update public.lead_intake_staging s
  set setu_assigned_user_id = new.user_id,
      setu_assigned_name = coalesce(v_name, s.setu_assigned_name),
      setu_assigned_at = coalesce(s.setu_assigned_at, now())
  where s.organization_id = new.organization_id
    and lower(s.setu_assigned_email) = v_email
    and s.setu_assigned_user_id is distinct from new.user_id;

  update public.leads l
  set owner_user_id = new.user_id,
      updated_at = now()
  where l.organization_id = new.organization_id
    and l.owner_user_id is distinct from new.user_id
    and exists (
      select 1
      from public.lead_intake_staging s
      where s.organization_id = new.organization_id
        and s.qualified_lead_id = l.id
        and lower(s.setu_assigned_email) = v_email
    );

  return new;
end;
$$;

drop trigger if exists trg_resolve_stark_inbound_assignment_for_member on public.organization_members;
create trigger trg_resolve_stark_inbound_assignment_for_member
after insert or update of is_active on public.organization_members
for each row
execute function public.resolve_stark_inbound_assignment_for_member();

create or replace function public.sync_stark_inbound_qualified_lead_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     and new.qualified_lead_id is not null
     and new.setu_assigned_user_id is not null then
    update public.leads
    set owner_user_id = new.setu_assigned_user_id,
        updated_at = now()
    where id = new.qualified_lead_id
      and organization_id = new.organization_id
      and owner_user_id is distinct from new.setu_assigned_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_stark_inbound_qualified_lead_owner on public.lead_intake_staging;
create trigger trg_sync_stark_inbound_qualified_lead_owner
after insert or update of qualified_lead_id, setu_assigned_user_id on public.lead_intake_staging
for each row
execute function public.sync_stark_inbound_qualified_lead_owner();

-- Stark Interakt: assigned Sales sees own rows. Owners/admins/managers see the whole queue.
drop policy if exists lead_intake_staging_select_same_org on public.lead_intake_staging;
create policy lead_intake_staging_select_same_org
on public.lead_intake_staging
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
  and (
    lead_intake_staging.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    or lower(lead_intake_staging.source_provider) <> 'interakt'
    or lead_intake_staging.setu_assigned_user_id = (select auth.uid())
    or is_setu_platform_admin()
    or exists (
      select 1
      from public.organization_members viewer_member
      join public.user_roles viewer_user_role on viewer_user_role.organization_member_id = viewer_member.id
      join public.roles viewer_role on viewer_role.id = viewer_user_role.role_id
      where viewer_member.organization_id = lead_intake_staging.organization_id
        and viewer_member.user_id = (select auth.uid())
        and viewer_member.is_active = true
        and lower(viewer_role.name) in ('owner', 'admin', 'manager')
    )
  )
);

drop policy if exists lead_intake_staging_update_same_org on public.lead_intake_staging;
create policy lead_intake_staging_update_same_org
on public.lead_intake_staging
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
  and (
    lead_intake_staging.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    or lower(lead_intake_staging.source_provider) <> 'interakt'
    or lead_intake_staging.setu_assigned_user_id = (select auth.uid())
    or is_setu_platform_admin()
    or exists (
      select 1
      from public.organization_members viewer_member
      join public.user_roles viewer_user_role on viewer_user_role.organization_member_id = viewer_member.id
      join public.roles viewer_role on viewer_role.id = viewer_user_role.role_id
      where viewer_member.organization_id = lead_intake_staging.organization_id
        and viewer_member.user_id = (select auth.uid())
        and viewer_member.is_active = true
        and lower(viewer_role.name) in ('owner', 'admin', 'manager')
    )
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
  and (
    lead_intake_staging.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    or lower(lead_intake_staging.source_provider) <> 'interakt'
    or lead_intake_staging.setu_assigned_user_id = (select auth.uid())
    or is_setu_platform_admin()
    or exists (
      select 1
      from public.organization_members viewer_member
      join public.user_roles viewer_user_role on viewer_user_role.organization_member_id = viewer_member.id
      join public.roles viewer_role on viewer_role.id = viewer_user_role.role_id
      where viewer_member.organization_id = lead_intake_staging.organization_id
        and viewer_member.user_id = (select auth.uid())
        and viewer_member.is_active = true
        and lower(viewer_role.name) in ('owner', 'admin', 'manager')
    )
  )
);
