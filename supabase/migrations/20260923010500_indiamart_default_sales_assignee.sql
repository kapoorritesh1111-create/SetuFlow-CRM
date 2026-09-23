-- Route new Stark Packmate IndiaMART enquiries to an admin-configured default Sales user.
-- Existing manual assignments are preserved. If the configured user is no longer
-- an active Sales user, the previous Sales-pool fallback remains in place.

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

  -- IndiaMART preserves any deliberate/manual Setu assignment on later upserts.
  if v_provider = 'indiamart'
     and (
       new.setu_assigned_user_id is not null
       or new.setu_assigned_invitation_id is not null
       or nullif(btrim(new.setu_assigned_email), '') is not null
     ) then
    return new;
  end if;

  -- IndiaMART uses the default Sales user saved on its integration configuration.
  -- The configured user must still be active, hold the Sales role, and not be support.
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
      and lower(r.name) = 'sales'
      and lower(coalesce(p.email, '')) not like 'support@%'
    order by p.full_name nulls last, p.email
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

  -- Interakt continues to honor its provider-assignee mapping first.
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

  -- Never overwrite an existing Setu assignment.
  if new.setu_assigned_user_id is not null
     or new.setu_assigned_invitation_id is not null
     or nullif(btrim(new.setu_assigned_email), '') is not null then
    return new;
  end if;

  -- Safe fallback: an active Sales user only. Field Sales and support remain excluded.
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
