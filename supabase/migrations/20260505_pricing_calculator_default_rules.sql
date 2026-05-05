-- V17.4 additive pricing calculator defaults.
-- Stores organization-level and category-level default assumptions used by the product pricing calculator.

create table if not exists public.pricing_calculator_default_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_scope text not null check (rule_scope in ('organization', 'category')),
  category_id uuid null references public.product_categories(id) on delete cascade,
  currency text not null default 'USD',
  margin_mode text not null default 'markup' check (margin_mode in ('markup', 'margin')),
  inland_transport_cost numeric null,
  export_customs_cost numeric null,
  port_handling_cost numeric null,
  freight_cost numeric null,
  insurance_cost numeric null,
  import_duty_percent numeric null,
  destination_charges numeric null,
  local_delivery_cost numeric null,
  internal_margin_percent numeric null,
  distributor_margin_percent numeric null,
  retail_margin_percent numeric null,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id),
  updated_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_calculator_default_scope_category_check check (
    (rule_scope = 'organization' and category_id is null) or
    (rule_scope = 'category' and category_id is not null)
  )
);

create unique index if not exists pricing_calc_default_org_unique
  on public.pricing_calculator_default_rules (organization_id)
  where rule_scope = 'organization' and category_id is null;

create unique index if not exists pricing_calc_default_category_unique
  on public.pricing_calculator_default_rules (organization_id, category_id)
  where rule_scope = 'category' and category_id is not null;

alter table public.pricing_calculator_default_rules enable row level security;

drop policy if exists pricing_calculator_default_rules_member_select on public.pricing_calculator_default_rules;
create policy pricing_calculator_default_rules_member_select
  on public.pricing_calculator_default_rules
  for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = pricing_calculator_default_rules.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );

drop policy if exists pricing_calculator_default_rules_admin_write on public.pricing_calculator_default_rules;
create policy pricing_calculator_default_rules_admin_write
  on public.pricing_calculator_default_rules
  for all
  using (
    exists (
      select 1
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      where om.organization_id = pricing_calculator_default_rules.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and r.name in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      where om.organization_id = pricing_calculator_default_rules.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and r.name in ('owner', 'admin')
    )
  );
