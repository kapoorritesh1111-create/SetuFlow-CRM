-- Core Academy is intentionally isolated from all Packaging Academy tables,
-- triggers, functions, issue automation, and the packaging-test-evidence bucket.
create extension if not exists pgcrypto;

create table if not exists public.core_academy_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid references public.organization_members(id) on delete set null,
  module_id text not null,
  module_title text not null,
  step_id text not null,
  step_title text not null,
  route text not null,
  screenshot_filename text not null,
  academy_version text not null default '2026.07.29-v1',
  is_complete boolean not null default false,
  completed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, step_id)
);

create index if not exists core_academy_progress_org_user_idx
  on public.core_academy_progress (organization_id, user_id, updated_at desc);

create index if not exists core_academy_progress_module_idx
  on public.core_academy_progress (organization_id, module_id, is_complete);

alter table public.core_academy_progress enable row level security;

-- The application route uses the server-side service role after verifying
-- active workspace membership. Direct browser writes remain blocked.
revoke all on public.core_academy_progress from anon, authenticated;

grant all on public.core_academy_progress to service_role;

comment on table public.core_academy_progress is
  'Core platform academy progress. Deliberately separate from packaging_learning_progress and packaging_test_*.';
