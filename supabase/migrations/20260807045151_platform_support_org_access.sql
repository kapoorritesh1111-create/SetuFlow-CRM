alter table public.organization_members
  add column if not exists is_internal_support boolean not null default false;

create table if not exists public.platform_support_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  access_level text not null default 'owner' check (access_level in ('owner')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_support_users enable row level security;

drop policy if exists platform_support_users_select on public.platform_support_users;
create policy platform_support_users_select
on public.platform_support_users for select
to authenticated
using (user_id = auth.uid() or public.is_setu_platform_admin());

drop policy if exists platform_support_users_manage on public.platform_support_users;
create policy platform_support_users_manage
on public.platform_support_users for all
to authenticated
using (public.is_setu_platform_admin())
with check (public.is_setu_platform_admin());

create or replace function public.is_platform_support_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.platform_support_users psu
    where psu.user_id = p_user_id
      and psu.is_active = true
  );
$$;

revoke all on function public.is_platform_support_user(uuid) from public;
grant execute on function public.is_platform_support_user(uuid) to authenticated, service_role;

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
  if not exists (
    select 1 from public.platform_support_users
    where user_id = p_user_id and is_active = true
  ) then
    return;
  end if;

  for v_org in
    select o.id as organization_id, r.id as owner_role_id
    from public.organizations o
    join public.roles r on r.organization_id = o.id and lower(r.name) = 'owner'
  loop
    insert into public.organization_members (organization_id, user_id, is_active, is_internal_support)
    values (v_org.organization_id, p_user_id, true, true)
    on conflict (organization_id, user_id) do update
      set is_active = true,
          is_internal_support = true,
          updated_at = now()
    returning id into v_member_id;

    if not exists (
      select 1 from public.user_roles ur
      where ur.organization_member_id = v_member_id
        and ur.role_id = v_org.owner_role_id
    ) then
      insert into public.user_roles (organization_member_id, role_id)
      values (v_member_id, v_org.owner_role_id);
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_platform_support_memberships(uuid) from public, anon, authenticated;
grant execute on function public.sync_platform_support_memberships(uuid) to service_role;

create or replace function public.platform_support_user_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.is_active is true then
    perform public.sync_platform_support_memberships(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.platform_support_owner_role_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_support record;
  v_member_id uuid;
begin
  if new.organization_id is null or lower(new.name) <> 'owner' then
    return new;
  end if;

  for v_support in
    select user_id from public.platform_support_users where is_active = true
  loop
    insert into public.organization_members (organization_id, user_id, is_active, is_internal_support)
    values (new.organization_id, v_support.user_id, true, true)
    on conflict (organization_id, user_id) do update
      set is_active = true,
          is_internal_support = true,
          updated_at = now()
    returning id into v_member_id;

    if not exists (
      select 1 from public.user_roles ur
      where ur.organization_member_id = v_member_id
        and ur.role_id = new.id
    ) then
      insert into public.user_roles (organization_member_id, role_id)
      values (v_member_id, new.id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists platform_support_user_sync on public.platform_support_users;
create trigger platform_support_user_sync
after insert or update of is_active on public.platform_support_users
for each row execute function public.platform_support_user_sync_trigger();

drop trigger if exists platform_support_owner_role_sync on public.roles;
create trigger platform_support_owner_role_sync
after insert or update of name, organization_id on public.roles
for each row execute function public.platform_support_owner_role_sync_trigger();

drop policy if exists org_members_select_member on public.organization_members;
create policy org_members_select_member
on public.organization_members for select
to authenticated
using (
  public.is_org_member(organization_id)
  and (
    not is_internal_support
    or user_id = auth.uid()
    or public.is_setu_platform_admin()
  )
);

drop policy if exists org_members_update_admin on public.organization_members;
create policy org_members_update_admin
on public.organization_members for update
to authenticated
using ((public.is_org_admin(organization_id) and not is_internal_support) or public.is_setu_platform_admin())
with check ((public.is_org_admin(organization_id) and not is_internal_support) or public.is_setu_platform_admin());

drop policy if exists org_members_delete_admin on public.organization_members;
create policy org_members_delete_admin
on public.organization_members for delete
to authenticated
using ((public.is_org_admin(organization_id) and not is_internal_support) or public.is_setu_platform_admin());

drop policy if exists profiles_select_same_org on public.profiles;
create policy profiles_select_same_org
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target
      on target.organization_id = viewer.organization_id
    where viewer.user_id = auth.uid()
      and viewer.is_active = true
      and target.user_id = profiles.id
      and (
        not target.is_internal_support
        or target.user_id = auth.uid()
        or public.is_setu_platform_admin()
      )
  )
);

drop policy if exists user_roles_select_member on public.user_roles;
create policy user_roles_select_member
on public.user_roles for select
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.id = user_roles.organization_member_id
      and public.is_org_member(om.organization_id)
      and (
        not om.is_internal_support
        or om.user_id = auth.uid()
        or public.is_setu_platform_admin()
      )
  )
);

drop policy if exists user_roles_update_admin on public.user_roles;
create policy user_roles_update_admin
on public.user_roles for update
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.id = user_roles.organization_member_id
      and ((public.is_org_admin(om.organization_id) and not om.is_internal_support) or public.is_setu_platform_admin())
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.id = user_roles.organization_member_id
      and ((public.is_org_admin(om.organization_id) and not om.is_internal_support) or public.is_setu_platform_admin())
  )
);

drop policy if exists user_roles_delete_admin on public.user_roles;
create policy user_roles_delete_admin
on public.user_roles for delete
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.id = user_roles.organization_member_id
      and ((public.is_org_admin(om.organization_id) and not om.is_internal_support) or public.is_setu_platform_admin())
  )
);
