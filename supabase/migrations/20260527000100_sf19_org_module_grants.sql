create table if not exists public.org_module_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint org_module_grants_module_key_check check (module_key in ('full_crm', 'trade_show', 'orders_compliance', 'setu_guru', 'analytics', 'vcard')),
  constraint org_module_grants_unique unique (organization_id, module_key)
);

create index if not exists org_module_grants_organization_id_idx on public.org_module_grants(organization_id);
create index if not exists org_module_grants_enabled_idx on public.org_module_grants(organization_id, enabled);

alter table public.org_module_grants enable row level security;

drop policy if exists org_module_grants_select_member on public.org_module_grants;
drop policy if exists org_module_grants_insert_admin on public.org_module_grants;
drop policy if exists org_module_grants_update_admin on public.org_module_grants;
drop policy if exists org_module_grants_delete_admin on public.org_module_grants;
drop policy if exists org_module_grants_select_member_or_platform on public.org_module_grants;
drop policy if exists org_module_grants_insert_admin_or_platform on public.org_module_grants;
drop policy if exists org_module_grants_update_admin_or_platform on public.org_module_grants;
drop policy if exists org_module_grants_delete_admin_or_platform on public.org_module_grants;

create policy org_module_grants_select_member_or_platform
  on public.org_module_grants
  for select
  using (public.is_org_member(organization_id) or public.is_setu_platform_admin());

create policy org_module_grants_insert_admin_or_platform
  on public.org_module_grants
  for insert
  with check (public.is_org_admin(organization_id) or public.is_setu_platform_admin());

create policy org_module_grants_update_admin_or_platform
  on public.org_module_grants
  for update
  using (public.is_org_admin(organization_id) or public.is_setu_platform_admin())
  with check (public.is_org_admin(organization_id) or public.is_setu_platform_admin());

create policy org_module_grants_delete_admin_or_platform
  on public.org_module_grants
  for delete
  using (public.is_org_admin(organization_id) or public.is_setu_platform_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists org_module_grants_set_updated_at on public.org_module_grants;
create trigger org_module_grants_set_updated_at
before update on public.org_module_grants
for each row execute function public.set_updated_at();
