create table if not exists public.docs_workspace_screenshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid,
  title text not null,
  route text,
  area text,
  description text,
  image_url text not null,
  storage_path text,
  created_by uuid,
  created_by_name text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_docs_workspace_screenshots_org_created_at
  on public.docs_workspace_screenshots (organization_id, created_at desc);

create index if not exists idx_docs_workspace_screenshots_org_published
  on public.docs_workspace_screenshots (organization_id, is_published);

alter table public.docs_workspace_screenshots enable row level security;

create policy "docs_workspace_screenshots_org_members_select"
  on public.docs_workspace_screenshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = auth.uid()
        and om.organization_id = docs_workspace_screenshots.organization_id
    )
  );

create policy "docs_workspace_screenshots_org_members_insert"
  on public.docs_workspace_screenshots
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = auth.uid()
        and om.organization_id = docs_workspace_screenshots.organization_id
    )
  );

create policy "docs_workspace_screenshots_org_members_update"
  on public.docs_workspace_screenshots
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = auth.uid()
        and om.organization_id = docs_workspace_screenshots.organization_id
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = auth.uid()
        and om.organization_id = docs_workspace_screenshots.organization_id
    )
  );

create or replace function public.set_docs_workspace_screenshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_docs_workspace_screenshots_updated_at on public.docs_workspace_screenshots;
create trigger trg_docs_workspace_screenshots_updated_at
before update on public.docs_workspace_screenshots
for each row
execute function public.set_docs_workspace_screenshots_updated_at();
