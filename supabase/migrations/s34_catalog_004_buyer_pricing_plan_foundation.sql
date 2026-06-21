-- S34-CATALOG-035: Buyer-specific pricing plan foundation.
-- Applied live on 2026-06-21 via Supabase MCP before this repo record was added.
-- Additive only: does not change active catalog share pricing or quote conversion.

create table if not exists public.buyer_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  catalog_share_id uuid references public.catalog_shares(id) on delete set null,
  price_list_id uuid references public.price_lists(id) on delete set null,
  buyer_company text,
  buyer_segment text,
  currency text not null default 'USD',
  incoterm text,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','archived')),
  approval_required boolean not null default false,
  approval_reason text,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejection_reason text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buyer_pricing_plan_items (
  id uuid primary key default gen_random_uuid(),
  buyer_pricing_plan_id uuid not null references public.buyer_pricing_plans(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_list_item_id uuid references public.price_list_items(id) on delete set null,
  base_unit_price numeric,
  requested_unit_price numeric,
  currency text,
  discount_pct numeric,
  guardrail_status text not null default 'ok' check (guardrail_status in ('ok','warning','blocked')),
  guardrail_reason text,
  approval_required boolean not null default false,
  override_reason text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_pricing_plans_org_idx on public.buyer_pricing_plans (organization_id, created_at desc);
create index if not exists buyer_pricing_plans_lead_idx on public.buyer_pricing_plans (lead_id, created_at desc);
create index if not exists buyer_pricing_plan_items_plan_idx on public.buyer_pricing_plan_items (buyer_pricing_plan_id, sort_order);

alter table public.buyer_pricing_plans enable row level security;
alter table public.buyer_pricing_plan_items enable row level security;
