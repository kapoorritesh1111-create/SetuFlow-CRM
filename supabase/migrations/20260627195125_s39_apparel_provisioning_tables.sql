-- Sprint 39: Apparel Industry Provisioning & Demo Pack
-- Foundation tables for reusable industry profiles, templates, provisioning state, and seed run tracking.

create table if not exists public.organization_industry_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  industry_key text not null,
  apparel_subtypes text[] not null default '{}',
  sales_channels text[] not null default '{}',
  enabled_capabilities text[] not null default '{}',
  demo_mode boolean not null default false,
  provisioning_pack text,
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_industry_profiles_org_industry_key unique (organization_id, industry_key)
);

create table if not exists public.provisioning_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  industry_key text not null,
  template_type text not null,
  applies_to_subtypes text[] not null default '{}',
  applies_to_channels text[] not null default '{}',
  applies_to_capabilities text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_provisioning_state (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provisioning_pack text not null,
  applied_templates jsonb not null default '[]'::jsonb,
  seed_pack_applied text,
  provisioned_by text not null default 'system',
  provisioned_at timestamptz,
  last_reset_at timestamptz,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_provisioning_state_org_pack unique (organization_id, provisioning_pack),
  constraint organization_provisioning_state_status_check check (status in ('pending','applied','reset','error'))
);

create table if not exists public.demo_seed_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  seed_pack_key text not null,
  seed_version text not null default 'v1',
  run_status text not null default 'pending',
  records_created jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default now(),
  executed_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_seed_runs_status_check check (run_status in ('pending','success','error'))
);
