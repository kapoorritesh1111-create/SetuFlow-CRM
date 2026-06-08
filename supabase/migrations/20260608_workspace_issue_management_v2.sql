-- Pending migration only. Do not apply live until approved.

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
