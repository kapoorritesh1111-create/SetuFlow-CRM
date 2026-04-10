-- Durable per-member default view preferences.
create table if not exists public.view_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  entity_type text not null check (entity_type in ('leads','accounts','pipeline','rfqs','quotes')),
  saved_view_id uuid null references public.saved_views(id) on delete set null,
  built_in_view_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_view_preferences_one_source check (
    ((saved_view_id is not null)::int + (built_in_view_key is not null)::int) = 1
  )
);

create unique index if not exists uq_view_preferences_member_entity on public.view_preferences (organization_member_id, entity_type);
create index if not exists idx_view_preferences_org_member on public.view_preferences (organization_id, organization_member_id);

alter table public.view_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'view_preferences' and policyname = 'view_preferences_select'
  ) then
    create policy view_preferences_select on public.view_preferences
      for select using (
        exists (
          select 1 from public.organization_members om
          where om.id = view_preferences.organization_member_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'view_preferences' and policyname = 'view_preferences_insert'
  ) then
    create policy view_preferences_insert on public.view_preferences
      for insert with check (
        exists (
          select 1 from public.organization_members om
          where om.id = view_preferences.organization_member_id
            and om.organization_id = view_preferences.organization_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'view_preferences' and policyname = 'view_preferences_update'
  ) then
    create policy view_preferences_update on public.view_preferences
      for update using (
        exists (
          select 1 from public.organization_members om
          where om.id = view_preferences.organization_member_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      ) with check (
        exists (
          select 1 from public.organization_members om
          where om.id = view_preferences.organization_member_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'view_preferences' and policyname = 'view_preferences_delete'
  ) then
    create policy view_preferences_delete on public.view_preferences
      for delete using (
        exists (
          select 1 from public.organization_members om
          where om.id = view_preferences.organization_member_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
      );
  end if;
end $$;
