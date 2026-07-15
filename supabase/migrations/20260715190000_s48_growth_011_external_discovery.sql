-- Sprint 48 Phase 3: external discovery domain model
create table if not exists public.external_discovery_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','queued','running','completed','partial','failed','paused','archived')),
  icp_profile_id uuid references public.org_icp_profiles(id) on delete set null,
  icp_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.external_discovery_campaigns(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','queued','running','completed','partial','failed','paused','archived')),
  idempotency_key text not null,
  provider_key text,
  provider_request jsonb not null default '{}'::jsonb,
  provider_response jsonb not null default '{}'::jsonb,
  cost_amount numeric(12,4) not null default 0,
  cost_currency text not null default 'USD',
  attempt_count integer not null default 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create table if not exists public.external_opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.external_discovery_campaigns(id) on delete set null,
  job_id uuid references public.external_discovery_jobs(id) on delete set null,
  company_name text not null,
  normalized_company_name text not null,
  country text,
  company_type text,
  website_url text,
  primary_domain text,
  source_label text not null,
  source_url text,
  source_evidence jsonb not null default '[]'::jsonb,
  verification_state text not null default 'unverified' check (verification_state in ('unverified','source_verified','company_verified','contact_verified')),
  duplicate_state text not null default 'new' check (duplicate_state in ('new','possible_duplicate','confirmed_duplicate')),
  duplicate_reasons jsonb not null default '[]'::jsonb,
  matched_lead_id uuid references public.leads(id) on delete set null,
  fit_score integer not null default 0 check (fit_score between 0 and 100),
  fit_version text not null default 's48-v1',
  fit_reasons jsonb not null default '[]'::jsonb,
  fit_penalties jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  fit_scored_at timestamptz,
  review_status text not null default 'new' check (review_status in ('new','reviewing','approved','dismissed','converted')),
  converted_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_opportunity_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.external_opportunities(id) on delete cascade,
  full_name text,
  title text,
  email text,
  phone text,
  source_url text,
  verification_state text not null default 'unverified',
  created_at timestamptz not null default now()
);

create table if not exists public.external_opportunity_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.external_opportunities(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists external_campaigns_org_status_idx on public.external_discovery_campaigns(org_id,status,updated_at desc);
create index if not exists external_jobs_campaign_status_idx on public.external_discovery_jobs(org_id,campaign_id,status,updated_at desc);
create index if not exists external_opportunities_review_idx on public.external_opportunities(org_id,review_status,fit_score desc,created_at desc);
create index if not exists external_opportunities_domain_idx on public.external_opportunities(org_id,primary_domain);
create index if not exists external_opportunities_name_country_idx on public.external_opportunities(org_id,normalized_company_name,country);

alter table public.external_discovery_campaigns enable row level security;
alter table public.external_discovery_jobs enable row level security;
alter table public.external_opportunities enable row level security;
alter table public.external_opportunity_contacts enable row level security;
alter table public.external_opportunity_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['external_discovery_campaigns','external_discovery_jobs','external_opportunities','external_opportunity_contacts','external_opportunity_history'] loop
    execute format('drop policy if exists %I_org_member on public.%I', t, t);
    execute format('create policy %I_org_member on public.%I for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))', t, t);
  end loop;
end $$;
