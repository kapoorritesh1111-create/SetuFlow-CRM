create extension if not exists pgcrypto;
create table if not exists public.packaging_test_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  tester_user_id uuid references auth.users(id) on delete set null, tester_name text, tested_role text not null default 'sales',
  device text, browser text, status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  app_commit_sha text, started_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.packaging_test_results (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.packaging_test_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, step_id text not null, workflow text not null,
  step_title text not null, result text not null check (result in ('Pass','Fail','Blocked','N/A')), expected_result text,
  actual_result text, notes text, evidence_storage_path text, evidence_filename text,
  linked_issue_id uuid references public.sprint_issues(id) on delete set null, linked_issue_ref text,
  tested_by uuid references auth.users(id) on delete set null, tested_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(run_id,step_id)
);
create index if not exists packaging_test_runs_org_idx on public.packaging_test_runs(organization_id,started_at desc);
create index if not exists packaging_test_results_org_idx on public.packaging_test_results(organization_id,tested_at desc);
alter table public.packaging_test_runs enable row level security;
alter table public.packaging_test_results enable row level security;
revoke all on public.packaging_test_runs from anon,authenticated;
revoke all on public.packaging_test_results from anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('packaging-test-evidence','packaging-test-evidence',false,10485760,array['image/png','image/jpeg','image/webp']) on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
