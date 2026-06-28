create table if not exists public.organization_brand_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  brand_display_name text,
  primary_color text,
  secondary_color text,
  accent_color text,
  sidebar_theme text,
  login_logo_storage_path text,
  workspace_logo_storage_path text,
  quote_logo_storage_path text,
  document_logo_storage_path text,
  favicon_storage_path text,
  app_icon_storage_path text,
  logo_alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_brand_settings enable row level security;

drop policy if exists organization_brand_settings_select_member on public.organization_brand_settings;
create policy organization_brand_settings_select_member
  on public.organization_brand_settings
  for select
  using (public.is_org_member(organization_id));

drop policy if exists organization_brand_settings_insert_admin on public.organization_brand_settings;
create policy organization_brand_settings_insert_admin
  on public.organization_brand_settings
  for insert
  with check (public.is_org_admin(organization_id));

drop policy if exists organization_brand_settings_update_admin on public.organization_brand_settings;
create policy organization_brand_settings_update_admin
  on public.organization_brand_settings
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists organization_brand_settings_delete_admin on public.organization_brand_settings;
create policy organization_brand_settings_delete_admin
  on public.organization_brand_settings
  for delete
  using (public.is_org_admin(organization_id));

create index if not exists idx_org_brand_settings_org_id
  on public.organization_brand_settings(organization_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organization_brand_settings_updated_at on public.organization_brand_settings;
create trigger trg_organization_brand_settings_updated_at
  before update on public.organization_brand_settings
  for each row
  execute function public.set_updated_at_timestamp();

insert into public.organization_brand_settings (
  organization_id,
  brand_display_name,
  workspace_logo_storage_path,
  quote_logo_storage_path,
  document_logo_storage_path,
  logo_alt_text
)
select
  id,
  name,
  logo_storage_path,
  logo_storage_path,
  logo_storage_path,
  coalesce(name, 'Workspace') || ' logo'
from public.organizations
where logo_storage_path is not null
on conflict (organization_id) do update set
  brand_display_name = coalesce(public.organization_brand_settings.brand_display_name, excluded.brand_display_name),
  workspace_logo_storage_path = coalesce(public.organization_brand_settings.workspace_logo_storage_path, excluded.workspace_logo_storage_path),
  quote_logo_storage_path = coalesce(public.organization_brand_settings.quote_logo_storage_path, excluded.quote_logo_storage_path),
  document_logo_storage_path = coalesce(public.organization_brand_settings.document_logo_storage_path, excluded.document_logo_storage_path),
  logo_alt_text = coalesce(public.organization_brand_settings.logo_alt_text, excluded.logo_alt_text),
  updated_at = now();
