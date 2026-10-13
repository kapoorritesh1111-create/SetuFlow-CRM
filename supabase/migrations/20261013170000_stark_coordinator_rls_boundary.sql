-- S38 security: restrictive policies are ANDed with existing permissive policies.
-- This closes broad member grants for Stark lead record reads and updates.
create policy s38_stark_lead_select_boundary on public.leads
as restrictive for select to authenticated
using (
 organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
 or public.is_setu_platform_admin()
 or owner_user_id = (select auth.uid())
 or coordinator_user_id = (select auth.uid())
 or exists (
  select 1 from public.organization_members om
  join public.user_roles ur on ur.organization_member_id=om.id
  join public.roles r on r.id=ur.role_id
  where om.organization_id=leads.organization_id
    and om.user_id=(select auth.uid()) and om.is_active
    and lower(r.name) in ('owner','admin','manager')
 )
);
create policy s38_stark_lead_update_boundary on public.leads
as restrictive for update to authenticated
using (
 organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
 or public.is_setu_platform_admin()
 or owner_user_id = (select auth.uid())
 or coordinator_user_id = (select auth.uid())
 or exists (
  select 1 from public.organization_members om
  join public.user_roles ur on ur.organization_member_id=om.id
  join public.roles r on r.id=ur.role_id
  where om.organization_id=leads.organization_id and om.user_id=(select auth.uid())
    and om.is_active and lower(r.name) in ('owner','admin','manager')
 )
)
with check (
 organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
 or public.is_setu_platform_admin()
 or owner_user_id = (select auth.uid())
 or coordinator_user_id = (select auth.uid())
 or exists (
  select 1 from public.organization_members om
  join public.user_roles ur on ur.organization_member_id=om.id
  join public.roles r on r.id=ur.role_id
  where om.organization_id=leads.organization_id and om.user_id=(select auth.uid())
    and om.is_active and lower(r.name) in ('owner','admin','manager')
 )
);
