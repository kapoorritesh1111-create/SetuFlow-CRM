-- Complete the Stark Field Sales RLS boundary for DELETE operations.
-- The organization-wide delete policy is permissive, so Field Sales needs a
-- restrictive policy just like SELECT/INSERT/UPDATE.

drop policy if exists stark_field_sales_leads_delete_restrict on public.leads;

create policy stark_field_sales_leads_delete_restrict
on public.leads
as restrictive
for delete
to authenticated
using (
  not (
    leads.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and exists (
      select 1
      from public.organization_members viewer_member
      join public.user_roles viewer_user_role on viewer_user_role.organization_member_id = viewer_member.id
      join public.roles viewer_role on viewer_role.id = viewer_user_role.role_id
      where viewer_member.organization_id = leads.organization_id
        and viewer_member.user_id = (select auth.uid())
        and viewer_member.is_active = true
        and lower(viewer_role.name) = 'field_sales'
    )
  )
  or (
    leads.owner_user_id = (select auth.uid())
    and coalesce(lower(leads.source_type), '') <> 'interakt'
  )
);
