-- S52-PKG-V5-001
-- Additive Pricing v5 schema. Existing v4 tables, routes and feature flag remain unchanged.
begin;

alter table public.packaging_pricing_templates
  drop constraint if exists packaging_pricing_templates_v4_engine_key_check;
alter table public.packaging_pricing_templates
  add constraint packaging_pricing_templates_v4_engine_key_check
  check (calculation_engine_key is null or calculation_engine_key in ('sup_formula','sup_formula_v5','matrix_per_frame','service_formula'));

create table if not exists public.packaging_size_profiles_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  size_key text not null,
  name text not null,
  width_mm numeric not null,
  height_mm numeric not null,
  bottom_gusset_each_mm numeric not null default 0,
  pricing_bucket smallint not null check (pricing_bucket between 1 and 5),
  production_profile_key text,
  gusset_production_mode text not null default 'integrated' check (gusset_production_mode in ('integrated','separate','conditional')),
  bottom_registration_mode text not null default 'not_applicable' check (bottom_registration_mode in ('not_applicable','optional','required_registered','required_unregistered')),
  is_active boolean not null default true,
  is_quoteable boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_size_profiles_v5_family_org_fkey foreign key (organization_id,family_id)
    references public.packaging_service_families(organization_id,id) on delete cascade,
  constraint packaging_size_profiles_v5_dimensions_check check (width_mm>0 and height_mm>0 and bottom_gusset_each_mm>=0),
  unique (organization_id,family_id,size_key),
  unique (organization_id,id)
);

create table if not exists public.packaging_constructions_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  construction_key text not null,
  construction_family_key text not null,
  name text not null,
  finish_type text,
  barrier_type text,
  sealant_code text not null,
  layer_count smallint not null check (layer_count between 2 and 6),
  is_active boolean not null default true,
  is_quoteable boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_constructions_v5_family_org_fkey foreign key (organization_id,family_id)
    references public.packaging_service_families(organization_id,id) on delete cascade,
  unique (organization_id,family_id,construction_key),
  unique (organization_id,id)
);

create table if not exists public.packaging_construction_layers_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  construction_id uuid not null,
  layer_position smallint not null check (layer_position>0),
  role_key text not null,
  cost_master_item_id uuid not null,
  is_print_layer boolean not null default false,
  is_sealant_layer boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint packaging_construction_layers_v5_construction_org_fkey foreign key (organization_id,construction_id)
    references public.packaging_constructions_v5(organization_id,id) on delete cascade,
  constraint packaging_construction_layers_v5_cost_org_fkey foreign key (organization_id,cost_master_item_id)
    references public.packaging_cost_master_items(organization_id,id) on delete restrict,
  unique (organization_id,construction_id,layer_position),
  unique (organization_id,id)
);

create table if not exists public.packaging_pricing_commercial_bands_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  pricing_bucket smallint not null check (pricing_bucket between 1 and 5),
  run_length_max_m numeric not null check (run_length_max_m>0),
  wastage_pct numeric not null check (wastage_pct between 0 and 100),
  margin_per_frame numeric not null check (margin_per_frame>=0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_commercial_bands_v5_template_org_fkey foreign key (organization_id,template_id)
    references public.packaging_pricing_templates(organization_id,id) on delete cascade,
  unique (organization_id,template_id,pricing_bucket,run_length_max_m),
  unique (organization_id,id)
);

create index if not exists idx_packaging_size_profiles_v5_org_family on public.packaging_size_profiles_v5(organization_id,family_id,is_active,sort_order);
create index if not exists idx_packaging_constructions_v5_org_family on public.packaging_constructions_v5(organization_id,family_id,is_active,sort_order);
create index if not exists idx_packaging_construction_layers_v5_construction on public.packaging_construction_layers_v5(organization_id,construction_id,layer_position);
create index if not exists idx_packaging_commercial_bands_v5_lookup on public.packaging_pricing_commercial_bands_v5(organization_id,template_id,pricing_bucket,run_length_max_m);

alter table public.packaging_size_profiles_v5 enable row level security;
alter table public.packaging_constructions_v5 enable row level security;
alter table public.packaging_construction_layers_v5 enable row level security;
alter table public.packaging_pricing_commercial_bands_v5 enable row level security;

create policy packaging_size_profiles_v5_member_read on public.packaging_size_profiles_v5 for select to authenticated using (public.is_org_member(organization_id));
create policy packaging_size_profiles_v5_admin_all on public.packaging_size_profiles_v5 for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_constructions_v5_admin_all on public.packaging_constructions_v5 for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_construction_layers_v5_admin_all on public.packaging_construction_layers_v5 for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy packaging_pricing_commercial_bands_v5_admin_all on public.packaging_pricing_commercial_bands_v5 for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

grant select,insert,update,delete on public.packaging_size_profiles_v5 to authenticated;
grant select,insert,update,delete on public.packaging_constructions_v5 to authenticated;
grant select,insert,update,delete on public.packaging_construction_layers_v5 to authenticated;
grant select,insert,update,delete on public.packaging_pricing_commercial_bands_v5 to authenticated;

insert into public.smc_feature_flags(flag_key,name,description,enabled,rollout_percentage,allowed_orgs,blocked_orgs)
values('packaging_pricing_v5','Packaging Pricing v5','September 2026 workbook-backed SUP pricing engine. Additive to v4; disabled until explicit UAT cutover.',false,0,array['b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid],array[]::uuid[])
on conflict(flag_key) do update set name=excluded.name,description=excluded.description,enabled=false,rollout_percentage=0,allowed_orgs=excluded.allowed_orgs,updated_at=now();

commit;
