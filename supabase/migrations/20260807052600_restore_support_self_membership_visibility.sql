-- Restore authenticated SETU Support authorization without exposing hidden
-- support memberships in client-facing member lists.
--
-- Normal members can see normal members in their organization. An internal
-- support membership is visible only to the support user that owns that row,
-- which allows workspace/role resolution while keeping the account hidden from
-- the client user directory and seat model.

drop policy if exists org_members_select_member on public.organization_members;

create policy org_members_select_member
on public.organization_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    is_internal_support is false
    and public.is_org_member(organization_id)
  )
);

comment on policy org_members_select_member on public.organization_members is
  'Normal organization members can see normal members in their organization. Internal SETU support memberships are visible only to the support user itself.';
