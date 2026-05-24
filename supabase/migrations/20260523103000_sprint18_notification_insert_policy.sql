do $$
begin
  create policy "Members create org notifications" on public.notifications
    for insert
    with check (
      public.is_org_member(organization_id)
      and exists (
        select 1
        from public.organization_members recipient_membership
        where recipient_membership.organization_id = notifications.organization_id
          and recipient_membership.user_id = notifications.user_id
          and recipient_membership.is_active = true
      )
    );
exception when duplicate_object then null;
end $$;
