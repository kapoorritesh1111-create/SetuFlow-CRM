create or replace function public.sync_platform_support_memberships(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org record;
  v_member_id uuid;
begin
  if not exists (select 1 from public.platform_support_users where user_id=p_user_id and is_active=true) then return; end if;
  for v_org in
    select o.id as organization_id,
           coalesce(
             (select r1.id from public.roles r1 where r1.organization_id=o.id and lower(r1.name)='owner' limit 1),
             (select r2.id from public.roles r2 where r2.organization_id is null and lower(r2.name)='owner' limit 1)
           ) as owner_role_id
    from public.organizations o
  loop
    if v_org.owner_role_id is null then continue; end if;
    insert into public.organization_members (organization_id,user_id,is_active,is_internal_support)
    values (v_org.organization_id,p_user_id,true,true)
    on conflict (organization_id,user_id) do update set is_active=true,is_internal_support=true,updated_at=now()
    returning id into v_member_id;
    if not exists (select 1 from public.user_roles where organization_member_id=v_member_id and role_id=v_org.owner_role_id) then
      insert into public.user_roles (organization_member_id,role_id) values (v_member_id,v_org.owner_role_id);
    end if;
  end loop;
end;
$$;
