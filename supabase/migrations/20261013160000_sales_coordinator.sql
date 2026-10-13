-- S38: lead coordination is separate from sales ownership.
alter table public.leads add column if not exists coordinator_user_id uuid references auth.users(id);
create index if not exists leads_org_coordinator_idx on public.leads (organization_id, coordinator_user_id) where coordinator_user_id is not null;
create table if not exists public.lead_coordination_audit (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 lead_id uuid not null references public.leads(id) on delete cascade,
 actor_user_id uuid not null,
 old_owner_user_id uuid,
 new_owner_user_id uuid,
 old_coordinator_user_id uuid,
 new_coordinator_user_id uuid,
 created_at timestamptz not null default now()
);
alter table public.lead_coordination_audit enable row level security;
create policy lead_coordination_audit_view on public.lead_coordination_audit for select to authenticated using (public.is_org_admin(organization_id) or actor_user_id = (select auth.uid()));
-- Writes are only performed by the checked server action through the service role.
insert into public.roles (organization_id,name,description)
select o.id, 'sales_coordinator', 'Manage owned leads and explicitly delegated sales coordination'
from public.organizations o
where not exists (select 1 from public.roles r where r.organization_id=o.id and lower(r.name)='sales_coordinator');
