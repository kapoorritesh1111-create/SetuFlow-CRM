-- S52-PKG-V5-005
-- Admin-only competitor observations used by the Pricing v5 analysis matrix.
begin;

create table if not exists public.packaging_pricing_competitor_benchmarks_v5 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  size_profile_id uuid not null,
  construction_id uuid,
  quantity numeric not null check (quantity>0),
  unit_price numeric not null check (unit_price>=0),
  currency text not null default 'INR',
  competitor_name text,
  customer_reference text,
  notes text,
  observed_at date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_comp_benchmark_family_org_fkey foreign key (organization_id,family_id)
    references public.packaging_service_families(organization_id,id) on delete cascade,
  constraint packaging_pricing_comp_benchmark_size_org_fkey foreign key (organization_id,size_profile_id)
    references public.packaging_size_profiles_v5(organization_id,id) on delete cascade,
  constraint packaging_pricing_comp_benchmark_construction_org_fkey foreign key (organization_id,construction_id)
    references public.packaging_constructions_v5(organization_id,id) on delete set null (construction_id),
  unique (organization_id,id)
);

create index if not exists idx_packaging_pricing_comp_benchmark_lookup
  on public.packaging_pricing_competitor_benchmarks_v5(organization_id,size_profile_id,construction_id,quantity,observed_at desc);

alter table public.packaging_pricing_competitor_benchmarks_v5 enable row level security;
create policy packaging_pricing_comp_benchmark_admin_all
  on public.packaging_pricing_competitor_benchmarks_v5 for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
grant select,insert,update,delete on public.packaging_pricing_competitor_benchmarks_v5 to authenticated;

commit;
