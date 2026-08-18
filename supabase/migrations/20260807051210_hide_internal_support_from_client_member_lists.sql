drop policy if exists org_members_select_member on public.organization_members;
create policy org_members_select_member
on public.organization_members
for select
to authenticated
using (
  public.is_org_member(organization_id)
  and is_internal_support is false
);

comment on column public.organization_members.is_internal_support is
  'Internal SETU support memberships. Hidden from normal organization member lists and excluded from client seat counts.';
