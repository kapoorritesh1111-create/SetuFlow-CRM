-- Keep Stark Packmate Interakt ownership exactly as assigned by Interakt on first capture.
-- Once Setu Flow has an owner, no provider/system update may change it.
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
    select om.user_id, null::uuid, lower(p.email), coalesce(nullif(p.full_name,''),p.email)
      into v_choice
    from public.integrations i
    join public.organization_members om on om.organization_id=i.organization_id
      and om.user_id::text=nullif(i.configuration->>'default_sales_assignee_user_id','')
      and om.is_active=true
    join public.user_roles ur on ur.organization_member_id=om.id
    join public.roles r on r.id=ur.role_id
    join public.profiles p on p.id=om.user_id
    where i.organization_id=new.organization_id
      and lower(i.provider)='indiamart'
      and lower(r.name) in ('sales','field_sales')
    limit 1;

    if v_choice.user_id is not null then
      new.setu_assigned_user_id := v_choice.user_id;
      new.setu_assigned_invitation_id := null;
      new.setu_assigned_email := v_choice.email;
      new.setu_assigned_name := v_choice.display_name;
      new.setu_assigned_at := now();
    end if;
    return new;
  end if;

  v_interakt_name := lower(regexp_replace(btrim(coalesce(new.interakt_assignee_name,'')), '\s+', ' ', 'g'));
  if v_interakt_name = '' then return new; end if;

  select om.user_id, null::uuid, lower(p.email), coalesce(nullif(p.full_name,''),p.email)
    into v_choice
  from public.organization_members om
  join public.user_roles ur on ur.organization_member_id=om.id
  join public.roles r on r.id=ur.role_id
  join public.profiles p on p.id=om.user_id
  where om.organization_id=new.organization_id
    and om.is_active=true
    and lower(r.name) in ('sales','field_sales')
    and (
      v_interakt_name = lower(regexp_replace(btrim(coalesce(p.full_name,'')), '\s+', ' ', 'g'))
      or v_interakt_name like lower(regexp_replace(btrim(coalesce(p.full_name,'')), '\s+', ' ', 'g')) || ' %'
    )
  order by case when v_interakt_name = lower(regexp_replace(btrim(coalesce(p.full_name,'')), '\s+', ' ', 'g')) then 0 else 1 end
  limit 1;

  if v_choice.user_id is not null then
    new.setu_assigned_user_id := v_choice.user_id;
    new.setu_assigned_invitation_id := null;
    new.setu_assigned_email := v_choice.email;
    new.setu_assigned_name := v_choice.display_name;
    new.setu_assigned_at := now();
  end if;
  return new;
end;
$$;
