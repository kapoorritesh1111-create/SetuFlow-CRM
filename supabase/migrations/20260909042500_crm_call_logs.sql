create table if not exists public.crm_call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid null references public.leads(id) on delete set null,
  intake_id uuid null references public.lead_intake_staging(id) on delete set null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  phone text not null,
  source_path text null,
  dialer_href text null,
  status text not null default 'initiated',
  disposition text null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  notes text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_call_logs_org_started_idx on public.crm_call_logs (organization_id, started_at desc);
create index if not exists crm_call_logs_lead_idx on public.crm_call_logs (lead_id, started_at desc) where lead_id is not null;
create index if not exists crm_call_logs_intake_idx on public.crm_call_logs (intake_id, started_at desc) where intake_id is not null;
create index if not exists crm_call_logs_actor_idx on public.crm_call_logs (actor_user_id, started_at desc);

alter table public.crm_call_logs enable row level security;
revoke all on public.crm_call_logs from anon, authenticated;
grant all on public.crm_call_logs to service_role;
