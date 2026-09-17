-- Stark Packmate inbound ownership guardrails.
-- Automatic assignment stays with active Sales users only, mirroring the Interakt sales model.
-- Support/service accounts are excluded even if they accidentally carry a Sales role.
-- Field Sales remains available for explicit Owner/Manager reassignment in the application.

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

  -- Interakt assignee mapping is honored only when the mapped person is an
  -- active Sales user and is not a support/service account.
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
        and lower(r.name) = 'sales'
        and lower(coalesce(p.email, '')) not like 'support@%'
        and lower(coalesce(p.full_name, '')) not like 'support@%'
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

  -- Never overwrite a valid existing Setu assignment. Support-like assignments
  -- are intentionally treated as invalid so they can be repaired by this trigger.
  if (new.setu_assigned_user_id is not null
      or new.setu_assigned_invitation_id is not null
      or nullif(btrim(new.setu_assigned_email), '') is not null)
     and lower(coalesce(new.setu_assigned_email, '')) not like 'support@%'
     and lower(coalesce(new.setu_assigned_name, '')) not like 'support@%' then
    return new;
  end if;

  -- Fallback pool is active/pending Sales only. Field Sales is deliberately not
  -- part of automatic assignment; Owners can explicitly reassign to Field Sales.
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
      and lower(coalesce(p.full_name, '')) not like 'support@%'

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
      and lower(coalesce(oi.metadata -> 'invitee' ->> 'full_name', '')) not like 'support@%'
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
before insert or update of interakt_assignee_name, source_provider
on public.lead_intake_staging
for each row
execute function public.assign_stark_inbound_sales_owner();

-- Repair existing active inbound records that were assigned to the Setu support
-- account. Clearing the invalid assignment while touching source_provider causes
-- the trigger above to immediately select a valid Sales assignee.
update public.lead_intake_staging s
set setu_assigned_user_id = null,
    setu_assigned_invitation_id = null,
    setu_assigned_email = null,
    setu_assigned_name = null,
    setu_assigned_at = null,
    source_provider = s.source_provider,
    updated_at = now()
where s.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  and s.source_provider in ('interakt', 'indiamart')
  and (
    lower(coalesce(s.setu_assigned_email, '')) like 'support@%'
    or lower(coalesce(s.setu_assigned_name, '')) like 'support@%'
  );
