begin;

-- Pass 22 live-test fixes:
-- 1) documents had review workflow triggers/functions that expect updated_at.
-- 2) lead_markets requires organization_id for direct app fallbacks.
-- 3) scheduled_tasks policies may reject authenticated inserts in older deployments.

alter table public.documents
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.documents
set updated_at = coalesce(reviewed_at, uploaded_at, timezone('utc', now()))
where updated_at is null;

create or replace function public.set_documents_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_documents_set_updated_at on public.documents;
create trigger trg_documents_set_updated_at
before update on public.documents
for each row
execute function public.set_documents_updated_at();

-- Keep direct relation inserts compatible with the current schema.
alter table public.lead_markets
  add column if not exists organization_id uuid;

update public.lead_markets lm
set organization_id = l.organization_id
from public.leads l
where lm.lead_id = l.id
  and lm.organization_id is null;

alter table public.lead_markets
  alter column organization_id set not null;

-- RLS repair for task creation. Policy is scoped to active organization membership.
drop policy if exists scheduled_tasks_member_select on public.scheduled_tasks;
drop policy if exists scheduled_tasks_member_insert on public.scheduled_tasks;
drop policy if exists scheduled_tasks_member_update on public.scheduled_tasks;

create policy scheduled_tasks_member_select
on public.scheduled_tasks
for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = scheduled_tasks.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy scheduled_tasks_member_insert
on public.scheduled_tasks
for insert
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = scheduled_tasks.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy scheduled_tasks_member_update
on public.scheduled_tasks
for update
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = scheduled_tasks.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = scheduled_tasks.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

commit;
