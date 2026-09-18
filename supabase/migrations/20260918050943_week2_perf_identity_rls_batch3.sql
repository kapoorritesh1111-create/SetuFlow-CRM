-- Week 2 performance hardening batch 3
-- Preserve profile / role authorization while caching auth.uid() per statement.

drop policy if exists profiles_select_same_org on public.profiles;
create policy profiles_select_same_org
on public.profiles
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target
      on target.organization_id = viewer.organization_id
    where viewer.user_id = (select auth.uid())
      and viewer.is_active = true
      and target.user_id = profiles.id
      and (
        not target.is_internal_support
        or target.user_id = (select auth.uid())
        or is_setu_platform_admin()
      )
  )
);

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
as permissive
for select
to public
using (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
as permissive
for update
to public
using (id = (select auth.uid()));

drop policy if exists user_roles_select_member on public.user_roles;
create policy user_roles_select_member
on public.user_roles
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.id = user_roles.organization_member_id
      and is_org_member(om.organization_id)
      and (
        not om.is_internal_support
        or om.user_id = (select auth.uid())
        or is_setu_platform_admin()
      )
  )
);

analyze public.profiles;
analyze public.user_roles;
