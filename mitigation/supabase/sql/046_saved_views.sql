-- Durable saved views for leads, pipeline, RFQs, quotes, and future account lists.
create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('leads','accounts','pipeline','rfqs','quotes')),
  name text not null,
  description text null,
  visibility text not null default 'private' check (visibility in ('private','team','org')),
  filter_model jsonb not null default '{}'::jsonb,
  sort_model jsonb null,
  column_model jsonb null,
  created_by_membership_id uuid not null references public.organization_members(id) on delete restrict,
  updated_by_membership_id uuid null references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_views_org_entity on public.saved_views (organization_id, entity_type);
create index if not exists idx_saved_views_org_visibility on public.saved_views (organization_id, visibility);
create unique index if not exists uq_saved_views_org_entity_name on public.saved_views (organization_id, entity_type, lower(name));

alter table public.saved_views enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_views' and policyname = 'saved_views_select'
  ) then
    create policy saved_views_select on public.saved_views
      for select using (
        exists (
          select 1 from public.organization_members om
          where om.organization_id = saved_views.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_views' and policyname = 'saved_views_insert'
  ) then
    create policy saved_views_insert on public.saved_views
      for insert with check (
        exists (
          select 1 from public.organization_members om
          where om.id = saved_views.created_by_membership_id
            and om.organization_id = saved_views.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_views' and policyname = 'saved_views_update'
  ) then
    create policy saved_views_update on public.saved_views
      for update using (
        exists (
          select 1 from public.organization_members om
          where om.organization_id = saved_views.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      ) with check (
        exists (
          select 1 from public.organization_members om
          where om.organization_id = saved_views.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_views' and policyname = 'saved_views_delete'
  ) then
    create policy saved_views_delete on public.saved_views
      for delete using (
        exists (
          select 1 from public.organization_members om
          where om.organization_id = saved_views.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;
end $$;
