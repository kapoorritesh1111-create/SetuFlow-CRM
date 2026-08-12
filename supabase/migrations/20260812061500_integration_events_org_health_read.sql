-- S51-INTEG-007: Allow authenticated organization members to read
-- integration event status for organization-specific health/last-sync UI.

create policy "integration_events_org_members_select"
on public.integration_events
for select
to authenticated
using (
  exists (
    select 1
    from public.integrations i
    where i.id = integration_events.integration_id
      and public.is_org_member(i.organization_id)
  )
);

grant select on table public.integration_events to authenticated;
