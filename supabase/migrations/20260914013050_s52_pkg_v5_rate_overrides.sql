-- S52-PKG-V5-001B
-- Version-scoped Pricing v5 rate overrides. Material/process/charge identities remain
-- shared with v4, but v5 rate edits never mutate the working v4 Cost/Charge Masters.
begin;

create table if not exists public.packaging_pricing_cost_rates_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  cost_master_item_id uuid not null,
  current_rate numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_cost_rates_v5_template_org_fkey foreign key (organization_id,template_id)
    references public.packaging_pricing_templates(organization_id,id) on delete cascade,
  constraint packaging_pricing_cost_rates_v5_master_org_fkey foreign key (organization_id,cost_master_item_id)
    references public.packaging_cost_master_items(organization_id,id) on delete restrict,
  constraint packaging_pricing_cost_rates_v5_rate_check check (current_rate is null or current_rate>=0),
  unique (organization_id,template_id,cost_master_item_id),
  unique (organization_id,id)
);

create table if not exists public.packaging_pricing_charge_rates_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  charge_master_item_id uuid not null,
  current_rate numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_charge_rates_v5_template_org_fkey foreign key (organization_id,template_id)
    references public.packaging_pricing_templates(organization_id,id) on delete cascade,
  constraint packaging_pricing_charge_rates_v5_master_org_fkey foreign key (organization_id,charge_master_item_id)
    references public.packaging_charge_master_items(organization_id,id) on delete restrict,
  constraint packaging_pricing_charge_rates_v5_rate_check check (current_rate is null or current_rate>=0),
  unique (organization_id,template_id,charge_master_item_id),
  unique (organization_id,id)
);

create index if not exists idx_packaging_pricing_cost_rates_v5_lookup
  on public.packaging_pricing_cost_rates_v5(organization_id,template_id,cost_master_item_id);
create index if not exists idx_packaging_pricing_charge_rates_v5_lookup
  on public.packaging_pricing_charge_rates_v5(organization_id,template_id,charge_master_item_id);

alter table public.packaging_pricing_cost_rates_v5 enable row level security;
alter table public.packaging_pricing_charge_rates_v5 enable row level security;

create policy packaging_pricing_cost_rates_v5_admin_all
  on public.packaging_pricing_cost_rates_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_pricing_charge_rates_v5_admin_all
  on public.packaging_pricing_charge_rates_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

grant select,insert,update,delete on public.packaging_pricing_cost_rates_v5 to authenticated;
grant select,insert,update,delete on public.packaging_pricing_charge_rates_v5 to authenticated;

commit;
