create table if not exists public.docs_screenshots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  route text not null default '/',
  description text not null default '',
  image_name text not null default 'screenshot',
  image_data text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.docs_screenshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'docs_screenshots'
      and policyname = 'docs_screenshots_service_role_all'
  ) then
    create policy docs_screenshots_service_role_all
    on public.docs_screenshots
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

create index if not exists docs_screenshots_created_at_idx
  on public.docs_screenshots (created_at desc);
