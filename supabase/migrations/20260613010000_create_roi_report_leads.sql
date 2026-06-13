create table if not exists public.roi_report_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'roi_calculator',
  status text not null default 'potential_lead',
  qualification_status text not null default 'unqualified',
  requested_next_step text not null default 'report_only',
  full_name text not null,
  email text not null,
  company_name text not null,
  phone text,
  role text,
  main_pain_point text,
  selected_plan text not null,
  people_following_up integer not null,
  leads_captured_month integer not null,
  leads_lost_month integer not null,
  weekly_chase_hours numeric not null,
  recovered_lead_value numeric not null,
  hourly_cost numeric not null,
  time_reduction_rate numeric not null,
  lead_recovery_rate numeric not null,
  monthly_time_savings numeric not null,
  leads_recovered numeric not null,
  recovered_lead_value_total numeric not null,
  monthly_impact numeric not null,
  plan_cost numeric not null,
  net_monthly_impact numeric not null,
  payback_months numeric not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists roi_report_leads_created_at_idx on public.roi_report_leads (created_at desc);
create index if not exists roi_report_leads_email_idx on public.roi_report_leads (lower(email));
create index if not exists roi_report_leads_status_idx on public.roi_report_leads (status, qualification_status);

alter table public.roi_report_leads enable row level security;

drop policy if exists roi_report_leads_service_role_all on public.roi_report_leads;
create policy roi_report_leads_service_role_all
  on public.roi_report_leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
