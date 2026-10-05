-- Production hotfix: owners/admins must be able to delete lead-linked scheduled tasks.
drop policy if exists scheduled_tasks_admin_delete on public.scheduled_tasks;
create policy scheduled_tasks_admin_delete
on public.scheduled_tasks
for delete
to authenticated
using (public.is_org_admin(organization_id));
