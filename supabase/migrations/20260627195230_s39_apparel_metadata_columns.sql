alter table public.organizations
  add column if not exists industry_profile_id uuid references public.organization_industry_profiles(id),
  add column if not exists provisioning_status text not null default 'not_started',
  add column if not exists demo_mode boolean not null default false;

alter table public.products
  add column if not exists industry_metadata jsonb not null default '{}'::jsonb,
  add column if not exists apparel_subtypes text[] not null default '{}',
  add column if not exists sales_channels text[] not null default '{}',
  add column if not exists enabled_capabilities text[] not null default '{}';

alter table public.leads
  add column if not exists industry_metadata jsonb not null default '{}'::jsonb,
  add column if not exists apparel_subtypes text[] not null default '{}',
  add column if not exists sales_channels text[] not null default '{}',
  add column if not exists enabled_capabilities text[] not null default '{}';

alter table public.quotes
  add column if not exists industry_metadata jsonb not null default '{}'::jsonb,
  add column if not exists apparel_subtypes text[] not null default '{}',
  add column if not exists sales_channels text[] not null default '{}',
  add column if not exists enabled_capabilities text[] not null default '{}';
