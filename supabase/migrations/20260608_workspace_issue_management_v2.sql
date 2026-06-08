-- Workspace / Setu Mission Control Issue Management UX v2.
-- Applied live during PR completion after user approval to mitigate preview/build/runtime schema risks.

alter table public.sprint_issues
  add column if not exists priority text default 'P3',
  add column if not exists rank_order integer,
  add column if not exists kanban_order integer,
  add column if not exists table_order integer,
  add column if not exists blocked_by text[] default '{}',
  add column if not exists affected_route text,
  add column if not exists affected_module text,
  add column if not exists environment text,
  add column if not exists browser_device text,
  add column if not exists regression_risk text,
  add column if not exists steps_to_reproduce text,
  add column if not exists expected_behavior text,
  add column if not exists actual_behavior text,
  add column if not exists acceptance_criteria text,
  add column if not exists qa_notes text,
  add column if not exists commit_url text,
  add column if not exists target_date date,
  add column if not exists owner text;

create table if not exists public.sprint_issue_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  issue_id uuid not null references public.sprint_issues(id) on delete cascade,
  linked_issue_ref text not null,
  link_type text not null default 'related',
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists sprint_issue_links_issue_id_idx on public.sprint_issue_links(issue_id);
create index if not exists sprint_issue_links_org_type_idx on public.sprint_issue_links(organization_id, link_type);

create table if not exists public.sprint_issue_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  issue_id uuid not null references public.sprint_issues(id) on delete cascade,
  bucket text not null default 'issue-attachments',
  storage_path text,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create index if not exists sprint_issue_attachments_issue_id_idx on public.sprint_issue_attachments(issue_id);
create index if not exists sprint_issue_attachments_org_idx on public.sprint_issue_attachments(organization_id);

create table if not exists public.sprint_issue_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  issue_id uuid not null references public.sprint_issues(id) on delete cascade,
  activity_type text not null default 'checkpoint',
  from_status text,
  to_status text,
  body text,
  actor_name text default 'Ritesh Kapoor',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sprint_issue_activity_issue_id_idx on public.sprint_issue_activity(issue_id);
create index if not exists sprint_issue_activity_org_type_idx on public.sprint_issue_activity(organization_id, activity_type);

alter table public.sprint_issue_links enable row level security;
alter table public.sprint_issue_attachments enable row level security;
alter table public.sprint_issue_activity enable row level security;

drop policy if exists setu_flow_sprint_issue_links on public.sprint_issue_links;
create policy setu_flow_sprint_issue_links on public.sprint_issue_links
  for all
  using (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid)
  with check (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid);

drop policy if exists setu_flow_sprint_issue_attachments on public.sprint_issue_attachments;
create policy setu_flow_sprint_issue_attachments on public.sprint_issue_attachments
  for all
  using (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid)
  with check (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid);

drop policy if exists setu_flow_sprint_issue_activity on public.sprint_issue_activity;
create policy setu_flow_sprint_issue_activity on public.sprint_issue_activity
  for all
  using (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid)
  with check (organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'::uuid);
