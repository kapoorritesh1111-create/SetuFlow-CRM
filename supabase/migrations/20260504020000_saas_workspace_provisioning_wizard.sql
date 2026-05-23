-- SaaS provisioning hardening: client onboarding is Setu internal only.
-- New client workspaces are created as tenant-scoped organizations and never get access to this queue.

create or replace function public.is_setu_platform_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    join public.user_roles ur on ur.organization_member_id = om.id
    join public.roles r on r.id = ur.role_id
    where om.user_id = auth.uid()
      and om.is_active = true
      and o.slug = coalesce(nullif(current_setting('app.setu_internal_org_slug', true), ''), 'setu-flow')
      and r.name in ('owner', 'admin')
  );
$$;

comment on function public.is_setu_platform_admin() is 'True only for owner/admin members of the Setu internal platform organization. Used to keep client onboarding hidden from customer workspaces.';

drop policy if exists "client onboarding requests are visible to authenticated admins" on public.client_onboarding_requests;
drop policy if exists "client onboarding requests are editable by authenticated admins" on public.client_onboarding_requests;

create policy "client onboarding requests are visible to Setu platform admins"
  on public.client_onboarding_requests
  for select
  to authenticated
  using (public.is_setu_platform_admin());

create policy "client onboarding requests are editable by Setu platform admins"
  on public.client_onboarding_requests
  for update
  to authenticated
  using (public.is_setu_platform_admin())
  with check (public.is_setu_platform_admin());

create policy "client onboarding requests can be inserted by Setu platform admins"
  on public.client_onboarding_requests
  for insert
  to authenticated
  with check (public.is_setu_platform_admin());
