-- S51-PKG-043
-- Stark Packmate Packaging Pricing v4 foundation.
-- Additive only: existing v3 families, templates, JSON configuration and quote routing remain intact.

begin;

-- ---------------------------------------------------------------------------
-- Existing v3 parents: add nullable v4 metadata only.
-- NULL means "legacy / not yet migrated to v4" so current v3 semantics are preserved.
-- ---------------------------------------------------------------------------

alter table public.packaging_service_families
  add column if not exists product_setup_mode text,
  add column if not exists pricing_engine_type text,
  add column if not exists default_uom text,
  add column if not exists is_quoteable boolean;

alter table public.packaging_service_families
  drop constraint if exists packaging_service_families_product_setup_mode_check;

alter table public.packaging_service_families
  add constraint packaging_service_families_product_setup_mode_check
  check (
    product_setup_mode is null
    or product_setup_mode in ('approved_sizes', 'custom_dimensions', 'both')
  );

alter table public.packaging_service_families
  drop constraint if exists packaging_service_families_pricing_engine_type_check;

alter table public.packaging_service_families
  add constraint packaging_service_families_pricing_engine_type_check
  check (
    pricing_engine_type is null
    or pricing_engine_type in ('sup_formula', 'matrix_per_frame', 'service_formula')
  );

alter table public.packaging_pricing_templates
  add column if not exists status text,
  add column if not exists quote_config_json jsonb not null default '{}'::jsonb,
  add column if not exists supersedes_template_id uuid,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid;

alter table public.packaging_pricing_templates
  drop constraint if exists packaging_pricing_templates_v4_status_check;

alter table public.packaging_pricing_templates
  add constraint packaging_pricing_templates_v4_status_check
  check (status is null or status in ('draft', 'published', 'archived'));

-- Reuse existing calculation_engine_key + calculation_version as the v4 engine/version.
-- Do not create a second engine/version source of truth.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'packaging_pricing_templates_supersedes_template_id_fkey'
      and conrelid = 'public.packaging_pricing_templates'::regclass
  ) then
    alter table public.packaging_pricing_templates
      add constraint packaging_pricing_templates_supersedes_template_id_fkey
      foreign key (supersedes_template_id)
      references public.packaging_pricing_templates(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'packaging_pricing_templates_published_by_fkey'
      and conrelid = 'public.packaging_pricing_templates'::regclass
  ) then
    alter table public.packaging_pricing_templates
      add constraint packaging_pricing_templates_published_by_fkey
      foreign key (published_by)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

-- Organization-aware parent keys prevent cross-tenant links even for server/service-role writes.
create unique index if not exists uq_packaging_service_families_org_id_id
  on public.packaging_service_families (organization_id, id);

create unique index if not exists uq_packaging_pricing_templates_org_id_id
  on public.packaging_pricing_templates (organization_id, id);

-- ---------------------------------------------------------------------------
-- Product Variations: customer-facing physical specifications only.
-- No PE micron, material rate, process rate or COGS fields belong here.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_product_variations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null,
  variation_key text not null,
  name text not null,
  capacity_label text,
  width_mm numeric,
  height_mm numeric,
  bottom_gusset_each_mm numeric,
  dimension_label text,
  sku_code text,
  approval_state text not null default 'draft',
  is_quoteable boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_product_variations_family_org_fkey
    foreign key (organization_id, family_id)
    references public.packaging_service_families(organization_id, id)
    on delete cascade,
  constraint packaging_product_variations_approval_state_check
    check (approval_state in ('draft', 'approved', 'archived')),
  constraint packaging_product_variations_dimensions_check
    check (
      (width_mm is null or width_mm > 0)
      and (height_mm is null or height_mm > 0)
      and (bottom_gusset_each_mm is null or bottom_gusset_each_mm >= 0)
    ),
  unique (organization_id, family_id, variation_key),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Shared Cost Master: reusable raw/internal material + process cost records.
-- current_rate is deliberately nullable. NULL means "Needs rate", never zero.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_cost_master_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  item_type text not null,
  specification text,
  rate_basis text not null,
  current_rate numeric,
  rate_uom text not null,
  currency text not null default 'INR',
  micron numeric,
  gsm numeric,
  density numeric,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_cost_master_items_type_check
    check (item_type in ('material', 'process')),
  constraint packaging_cost_master_items_rate_basis_check
    check (rate_basis in ('per_kg', 'per_running_metre', 'per_frame', 'per_unit', 'flat')),
  constraint packaging_cost_master_items_rate_check
    check (current_rate is null or current_rate >= 0),
  constraint packaging_cost_master_items_physical_values_check
    check (
      (micron is null or micron > 0)
      and (gsm is null or gsm >= 0)
      and (density is null or density > 0)
    ),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.packaging_cost_master_family_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cost_master_item_id uuid not null,
  family_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint packaging_cost_master_family_links_item_org_fkey
    foreign key (organization_id, cost_master_item_id)
    references public.packaging_cost_master_items(organization_id, id)
    on delete cascade,
  constraint packaging_cost_master_family_links_family_org_fkey
    foreign key (organization_id, family_id)
    references public.packaging_service_families(organization_id, id)
    on delete cascade,
  unique (organization_id, cost_master_item_id, family_id),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Shared Charge Master. Enum values intentionally match the approved handoff.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_charge_master_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null,
  basis text not null,
  application_stage text not null,
  current_rate numeric,
  currency text not null default 'INR',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_charge_master_items_category_check
    check (category in ('extra', 'pre', 'post')),
  constraint packaging_charge_master_items_basis_check
    check (basis in ('per_unit', 'per_running_metre', 'per_frame', 'flat', 'percent')),
  constraint packaging_charge_master_items_application_stage_check
    check (application_stage in ('before_wastage_margin', 'after_core_price', 'separate_quote_line')),
  constraint packaging_charge_master_items_rate_check
    check (current_rate is null or current_rate >= 0),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table if not exists public.packaging_charge_master_family_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_master_item_id uuid not null,
  family_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint packaging_charge_master_family_links_item_org_fkey
    foreign key (organization_id, charge_master_item_id)
    references public.packaging_charge_master_items(organization_id, id)
    on delete cascade,
  constraint packaging_charge_master_family_links_family_org_fkey
    foreign key (organization_id, family_id)
    references public.packaging_service_families(organization_id, id)
    on delete cascade,
  unique (organization_id, charge_master_item_id, family_id),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Template recipes reference Master IDs only; rates never live in recipe JSON.
-- consumption_rule_json may hold quantity/GSM/bond/conditional consumption rules.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_pricing_recipe_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  construction_key text not null,
  role_key text not null,
  source_type text not null,
  cost_master_item_id uuid,
  charge_master_item_id uuid,
  consumption_rule_json jsonb not null default '{}'::jsonb,
  condition_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_recipe_items_template_org_fkey
    foreign key (organization_id, template_id)
    references public.packaging_pricing_templates(organization_id, id)
    on delete cascade,
  constraint packaging_pricing_recipe_items_cost_org_fkey
    foreign key (organization_id, cost_master_item_id)
    references public.packaging_cost_master_items(organization_id, id)
    on delete restrict,
  constraint packaging_pricing_recipe_items_charge_org_fkey
    foreign key (organization_id, charge_master_item_id)
    references public.packaging_charge_master_items(organization_id, id)
    on delete restrict,
  constraint packaging_pricing_recipe_items_source_type_check
    check (source_type in ('cost_master', 'charge_master')),
  constraint packaging_pricing_recipe_items_source_integrity_check
    check (
      (source_type = 'cost_master' and cost_master_item_id is not null and charge_master_item_id is null)
      or
      (source_type = 'charge_master' and charge_master_item_id is not null and cost_master_item_id is null)
    ),
  unique (organization_id, id)
);

-- NULL-aware uniqueness for recipe source IDs: one role/source may not be duplicated.
create unique index if not exists uq_packaging_recipe_cost_source
  on public.packaging_pricing_recipe_items (
    organization_id, template_id, construction_key, role_key, cost_master_item_id
  )
  where source_type = 'cost_master';

create unique index if not exists uq_packaging_recipe_charge_source
  on public.packaging_pricing_recipe_items (
    organization_id, template_id, construction_key, role_key, charge_master_item_id
  )
  where source_type = 'charge_master';

-- ---------------------------------------------------------------------------
-- Commercial bands: SUP run-length waste + margin rules.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_pricing_commercial_bands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  run_length_max_m numeric not null,
  wastage_pct numeric not null,
  margin_per_frame numeric not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_commercial_bands_template_org_fkey
    foreign key (organization_id, template_id)
    references public.packaging_pricing_templates(organization_id, id)
    on delete cascade,
  constraint packaging_pricing_commercial_bands_run_check check (run_length_max_m > 0),
  constraint packaging_pricing_commercial_bands_wastage_check check (wastage_pct >= 0 and wastage_pct <= 100),
  constraint packaging_pricing_commercial_bands_margin_check check (margin_per_frame >= 0),
  unique (organization_id, template_id, run_length_max_m),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Matrix-per-frame rows: explicit Q1-Q5 selling rates plus source traceability.
-- Full 96 + 48 + 48 Stark workbook seed is intentionally NOT part of this issue.
-- ---------------------------------------------------------------------------

create table if not exists public.packaging_pricing_matrix_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null,
  supply_form text not null,
  construction_key text not null,
  client_product_id text not null,
  width_mm numeric,
  height_mm numeric,
  q1_rate_per_frame numeric,
  q2_rate_per_frame numeric,
  q3_rate_per_frame numeric,
  q4_rate_per_frame numeric,
  q5_rate_per_frame numeric,
  source_worksheet text,
  source_row_number integer,
  source_reference text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_pricing_matrix_rows_template_org_fkey
    foreign key (organization_id, template_id)
    references public.packaging_pricing_templates(organization_id, id)
    on delete cascade,
  constraint packaging_pricing_matrix_rows_supply_form_check
    check (supply_form in ('center_seal', 'three_side_seal_roll', 'three_side_seal_pouch')),
  constraint packaging_pricing_matrix_rows_dimensions_check
    check ((width_mm is null or width_mm > 0) and (height_mm is null or height_mm > 0)),
  constraint packaging_pricing_matrix_rows_rates_check
    check (
      (q1_rate_per_frame is null or q1_rate_per_frame >= 0)
      and (q2_rate_per_frame is null or q2_rate_per_frame >= 0)
      and (q3_rate_per_frame is null or q3_rate_per_frame >= 0)
      and (q4_rate_per_frame is null or q4_rate_per_frame >= 0)
      and (q5_rate_per_frame is null or q5_rate_per_frame >= 0)
    ),
  unique (organization_id, template_id, supply_form, client_product_id),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- KLD + Quote-line references. Legacy size_preset_key is retained unchanged.
-- ---------------------------------------------------------------------------

alter table public.packaging_kld_files
  add column if not exists product_variation_id uuid,
  add column if not exists spec_key text;

alter table public.packaging_kld_files
  drop constraint if exists packaging_kld_files_product_variation_org_fkey;

alter table public.packaging_kld_files
  add constraint packaging_kld_files_product_variation_org_fkey
  foreign key (organization_id, product_variation_id)
  references public.packaging_product_variations(organization_id, id)
  on delete set null (product_variation_id);

alter table public.quote_line_items
  add column if not exists packaging_product_variation_id uuid,
  add column if not exists packaging_kld_file_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quote_line_items_packaging_product_variation_id_fkey'
      and conrelid = 'public.quote_line_items'::regclass
  ) then
    alter table public.quote_line_items
      add constraint quote_line_items_packaging_product_variation_id_fkey
      foreign key (packaging_product_variation_id)
      references public.packaging_product_variations(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'quote_line_items_packaging_kld_file_id_fkey'
      and conrelid = 'public.quote_line_items'::regclass
  ) then
    alter table public.quote_line_items
      add constraint quote_line_items_packaging_kld_file_id_fkey
      foreign key (packaging_kld_file_id)
      references public.packaging_kld_files(id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Query indexes.
-- ---------------------------------------------------------------------------

create index if not exists idx_packaging_product_variations_org_family_active
  on public.packaging_product_variations (organization_id, family_id, is_active, sort_order);
create index if not exists idx_packaging_cost_master_items_org_active
  on public.packaging_cost_master_items (organization_id, is_active, item_type);
create index if not exists idx_packaging_cost_master_family_links_family
  on public.packaging_cost_master_family_links (organization_id, family_id);
create index if not exists idx_packaging_charge_master_items_org_active
  on public.packaging_charge_master_items (organization_id, is_active, category);
create index if not exists idx_packaging_charge_master_family_links_family
  on public.packaging_charge_master_family_links (organization_id, family_id);
create index if not exists idx_packaging_pricing_recipe_items_template
  on public.packaging_pricing_recipe_items (organization_id, template_id, construction_key, sort_order);
create index if not exists idx_packaging_pricing_commercial_bands_template
  on public.packaging_pricing_commercial_bands (organization_id, template_id, run_length_max_m);
create index if not exists idx_packaging_pricing_matrix_rows_lookup
  on public.packaging_pricing_matrix_rows (organization_id, template_id, supply_form, client_product_id)
  where is_active = true;
create index if not exists idx_packaging_kld_files_product_variation
  on public.packaging_kld_files (organization_id, product_variation_id)
  where product_variation_id is not null;
create index if not exists idx_quote_line_items_packaging_product_variation
  on public.quote_line_items (packaging_product_variation_id)
  where packaging_product_variation_id is not null;
create index if not exists idx_quote_line_items_packaging_kld
  on public.quote_line_items (packaging_kld_file_id)
  where packaging_kld_file_id is not null;

-- ---------------------------------------------------------------------------
-- RLS.
-- Product variations are safe operational data for org members.
-- Cost/Charge Masters, recipe rules, commercial bands and matrix selling rates
-- are confidential direct tables: owner/admin only. Sales must use redacted
-- server-side quote/pricing APIs added in later issues.
-- ---------------------------------------------------------------------------

alter table public.packaging_product_variations enable row level security;
alter table public.packaging_cost_master_items enable row level security;
alter table public.packaging_cost_master_family_links enable row level security;
alter table public.packaging_charge_master_items enable row level security;
alter table public.packaging_charge_master_family_links enable row level security;
alter table public.packaging_pricing_recipe_items enable row level security;
alter table public.packaging_pricing_commercial_bands enable row level security;
alter table public.packaging_pricing_matrix_rows enable row level security;

drop policy if exists packaging_product_variations_member_read on public.packaging_product_variations;
create policy packaging_product_variations_member_read
  on public.packaging_product_variations
  for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists packaging_product_variations_admin_insert on public.packaging_product_variations;
create policy packaging_product_variations_admin_insert
  on public.packaging_product_variations
  for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_product_variations_admin_update on public.packaging_product_variations;
create policy packaging_product_variations_admin_update
  on public.packaging_product_variations
  for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_product_variations_admin_delete on public.packaging_product_variations;
create policy packaging_product_variations_admin_delete
  on public.packaging_product_variations
  for delete
  to authenticated
  using (public.is_org_admin(organization_id));

-- Explicit policies rather than a permissive org-member policy prevent Sales
-- from directly querying confidential pricing rows.
drop policy if exists packaging_cost_master_items_admin_all on public.packaging_cost_master_items;
create policy packaging_cost_master_items_admin_all
  on public.packaging_cost_master_items
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_cost_master_family_links_admin_all on public.packaging_cost_master_family_links;
create policy packaging_cost_master_family_links_admin_all
  on public.packaging_cost_master_family_links
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_charge_master_items_admin_all on public.packaging_charge_master_items;
create policy packaging_charge_master_items_admin_all
  on public.packaging_charge_master_items
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_charge_master_family_links_admin_all on public.packaging_charge_master_family_links;
create policy packaging_charge_master_family_links_admin_all
  on public.packaging_charge_master_family_links
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_pricing_recipe_items_admin_all on public.packaging_pricing_recipe_items;
create policy packaging_pricing_recipe_items_admin_all
  on public.packaging_pricing_recipe_items
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_pricing_commercial_bands_admin_all on public.packaging_pricing_commercial_bands;
create policy packaging_pricing_commercial_bands_admin_all
  on public.packaging_pricing_commercial_bands
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists packaging_pricing_matrix_rows_admin_all on public.packaging_pricing_matrix_rows;
create policy packaging_pricing_matrix_rows_admin_all
  on public.packaging_pricing_matrix_rows
  for all
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Grants are deliberately no broader than authenticated; RLS remains authoritative.
grant select, insert, update, delete on public.packaging_product_variations to authenticated;
grant select, insert, update, delete on public.packaging_cost_master_items to authenticated;
grant select, insert, update, delete on public.packaging_cost_master_family_links to authenticated;
grant select, insert, update, delete on public.packaging_charge_master_items to authenticated;
grant select, insert, update, delete on public.packaging_charge_master_family_links to authenticated;
grant select, insert, update, delete on public.packaging_pricing_recipe_items to authenticated;
grant select, insert, update, delete on public.packaging_pricing_commercial_bands to authenticated;
grant select, insert, update, delete on public.packaging_pricing_matrix_rows to authenticated;

-- ---------------------------------------------------------------------------
-- Existing feature-flag infrastructure: Stark allowlisted, globally disabled.
-- This migration cannot switch production quote routing to v4.
-- ---------------------------------------------------------------------------

insert into public.smc_feature_flags (
  flag_key,
  name,
  description,
  enabled,
  rollout_percentage,
  allowed_orgs,
  blocked_orgs
)
values (
  'packaging_pricing_v4',
  'Packaging Pricing v4',
  'Normalized packaging pricing v4. Stark is allowlisted for controlled preview; production routing remains disabled until S51-PKG-051 cutover gates pass.',
  false,
  0,
  array['b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid],
  array[]::uuid[]
)
on conflict (flag_key) do update
set name = excluded.name,
    description = excluded.description,
    enabled = false,
    rollout_percentage = 0,
    allowed_orgs = excluded.allowed_orgs,
    updated_at = now();

commit;
