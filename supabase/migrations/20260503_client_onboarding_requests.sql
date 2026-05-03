-- Client onboarding intake and workspace setup requests.
create table if not exists public.client_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_slug text not null,
  workspace_domain text not null,
  logo_url text not null default '/logos/setu-flow-logo.png',
  website text,
  primary_admin_name text,
  primary_admin_email text not null,
  primary_phone text,
  headquarters_country text,
  requested_markets text[] not null default '{}',
  requested_countries text[] not null default '{}',
  requested_pipelines text[] not null default '{}',
  requested_pipeline_stages text[] not null default '{}',
  requested_next_steps text[] not null default '{}',
  pricing_rules_notes text,
  product_category_notes text,
  additional_notes text,
  wants_trade_events boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'setup_in_progress', 'admin_invite_ready', 'admin_invited', 'live', 'paused')),
  linked_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_onboarding_requests_status_idx on public.client_onboarding_requests(status, created_at desc);
create unique index if not exists client_onboarding_requests_workspace_domain_idx on public.client_onboarding_requests(workspace_domain);
alter table public.client_onboarding_requests enable row level security;
create policy "client onboarding requests are visible to authenticated admins" on public.client_onboarding_requests for select to authenticated using (true);
create policy "client onboarding requests are editable by authenticated admins" on public.client_onboarding_requests for update to authenticated using (true) with check (true);
comment on table public.client_onboarding_requests is 'Public client intake requests reviewed by Setu Flow before workspace creation and first admin invitation.';
comment on column public.client_onboarding_requests.workspace_domain is 'Reserved customer workspace host, e.g. companyname.setuflowcrm.com.';
comment on column public.client_onboarding_requests.logo_url is 'Falls back to Setu Flow logo when client does not provide one.';
