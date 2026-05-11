-- Sprint 8J: additive Orders execution schema foundation.
-- Approved scope: schema only, no UI/API behavior change.
-- Anchored to approved HTML preview: Orders Full Redesign Approval Walkthrough.
-- Purpose: introduce industry-neutral order execution records for later passes.
-- Safe rollout: no existing table is dropped or mutated; current contracts/orders UI stays compatible.

begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  legacy_contract_id uuid null references public.contracts(id),
  lead_id uuid not null references public.leads(id),
  source_quote_id uuid not null references public.quotes(id),
  source_quote_version_id uuid null references public.quote_versions(id),
  order_number text null,
  order_type text not null default 'regional',
  current_stage text not null default 'quote_approved',
  status text not null default 'draft',
  approval_state text not null default 'draft',
  currency text null,
  pricing_basis text null,
  incoterm text null,
  payment_terms text null,
  origin_country_id uuid null references public.countries(id),
  destination_country_id uuid null references public.countries(id),
  origin_place text null,
  destination_place text null,
  destination_port text null,
  buyer_reference text null,
  internal_notes text null,
  customer_notes text null,
  total_order_value numeric null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  source_quote_version_line_item_id uuid null references public.quote_version_line_items(id),
  source_contract_line_item_id uuid null references public.contract_line_items(id),
  product_id uuid null references public.products(id),
  product_variant_id uuid null references public.product_variants(id),
  product_category_id uuid null references public.product_categories(id),
  product_name_snapshot text not null,
  variant_name_snapshot text null,
  category_snapshot text null,
  sku_code text null,
  hs_code text null,
  hsn_code text null,
  quoted_quantity numeric null,
  ordered_quantity numeric not null default 0,
  approved_quantity numeric null,
  packed_quantity numeric null,
  loaded_quantity numeric null,
  dispatched_quantity numeric null,
  delivered_quantity numeric null,
  unit_of_measure text null,
  unit_price numeric null,
  currency text null,
  line_total numeric null,
  line_status text not null default 'draft',
  change_type text not null default 'from_quote',
  change_reason text null,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_approval_gates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  stage_key text not null,
  gate_type text not null,
  status text not null default 'draft',
  previewed_at timestamptz null,
  approved_by uuid null,
  approved_at timestamptz null,
  rejected_by uuid null,
  rejected_at timestamptz null,
  sent_at timestamptz null,
  completed_at timestamptz null,
  notes text null,
  reason text null,
  preview_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_stage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  stage_key text not null,
  event_type text not null,
  actor_user_id uuid null,
  event_at timestamptz not null default now(),
  summary text not null,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.order_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  legacy_contract_id uuid null references public.contracts(id),
  document_id uuid null references public.documents(id),
  approval_gate_id uuid null references public.order_approval_gates(id),
  document_type text not null,
  stage_key text not null,
  status text not null default 'draft',
  version_no integer not null default 1,
  generated_from_snapshot jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  approved_by uuid null,
  approved_at timestamptz null,
  sent_at timestamptz null,
  opened_at timestamptz null,
  superseded_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  rule_name text not null,
  order_type text null,
  stage_key text not null,
  requirement_type text not null,
  requirement_code text not null,
  title text not null,
  description text null,
  document_type text null,
  severity text not null default 'advisory',
  origin_country_id uuid null references public.countries(id),
  destination_country_id uuid null references public.countries(id),
  market_id uuid null references public.markets(id),
  product_category_id uuid null references public.product_categories(id),
  product_id uuid null references public.products(id),
  product_variant_id uuid null references public.product_variants(id),
  hs_code text null,
  hsn_code text null,
  shipment_mode text null,
  incoterm text null,
  source_type text not null default 'org_rule',
  source_url text null,
  source_title text null,
  source_checked_at timestamptz null,
  validity_days integer null,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_line_id uuid null references public.order_lines(id) on delete set null,
  rule_id uuid null references public.trade_requirement_rules(id),
  stage_key text not null,
  requirement_type text not null,
  requirement_code text not null,
  title text not null,
  description text null,
  document_type text null,
  severity text not null default 'advisory',
  status text not null default 'pending',
  source_snapshot jsonb not null default '{}'::jsonb,
  document_id uuid null references public.documents(id),
  order_document_id uuid null references public.order_documents(id),
  reviewer_user_id uuid null,
  reviewed_at timestamptz null,
  review_notes text null,
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_requirement_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid null references public.orders(id) on delete cascade,
  requirement_rule_id uuid null references public.trade_requirement_rules(id),
  requirement_id uuid null references public.trade_requirements(id),
  source_type text not null,
  source_name text null,
  source_url text null,
  source_title text null,
  source_checked_at timestamptz not null default now(),
  query_context jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  confidence text null,
  confirmed_by uuid null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.packing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  plan_type text not null default 'custom',
  template_key text null,
  container_type text null,
  vehicle_type text null,
  status text not null default 'draft',
  total_pallets numeric null,
  total_master_cases numeric null,
  total_inner_boxes numeric null,
  total_units numeric null,
  total_net_weight_kg numeric null,
  total_gross_weight_kg numeric null,
  total_cbm numeric null,
  assumptions_snapshot jsonb not null default '{}'::jsonb,
  preview_snapshot jsonb not null default '{}'::jsonb,
  approved_by uuid null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packing_plan_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  packing_plan_id uuid not null references public.packing_plans(id) on delete cascade,
  order_line_id uuid null references public.order_lines(id) on delete set null,
  sku_code text null,
  product_name_snapshot text null,
  cartons numeric null,
  units_per_carton numeric null,
  inner_boxes numeric null,
  units_per_inner_box numeric null,
  pallets numeric null,
  cases_per_pallet numeric null,
  pallet_pattern text null,
  net_weight_kg numeric null,
  gross_weight_kg numeric null,
  length_mm numeric null,
  width_mm numeric null,
  height_mm numeric null,
  cbm numeric null,
  marks_numbers text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.freight_rate_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  packing_plan_id uuid null references public.packing_plans(id),
  request_method text not null default 'manual',
  status text not null default 'draft',
  shipment_mode text null,
  incoterm text null,
  pickup_address text null,
  delivery_address text null,
  origin_country_id uuid null references public.countries(id),
  destination_country_id uuid null references public.countries(id),
  origin_port text null,
  destination_port text null,
  requested_to_snapshot jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz null,
  selected_quote_id uuid null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.freight_rate_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null references public.freight_rate_requests(id) on delete cascade,
  provider_name text not null,
  provider_type text null,
  quoted_amount numeric null,
  currency text null,
  transit_days integer null,
  service_level text null,
  validity_until date null,
  quote_payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  selected_at timestamptz null,
  selected_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'freight_rate_requests_selected_quote_fk'
  ) then
    alter table public.freight_rate_requests
      add constraint freight_rate_requests_selected_quote_fk
      foreign key (selected_quote_id) references public.freight_rate_quotes(id);
  end if;
end $$;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  freight_rate_quote_id uuid null references public.freight_rate_quotes(id),
  shipment_mode text not null,
  carrier_name text null,
  forwarder_name text null,
  booking_reference text null,
  bol_awb_number text null,
  tracking_number text null,
  status text not null default 'planned',
  pickup_at timestamptz null,
  loaded_at timestamptz null,
  dispatched_at timestamptz null,
  delivered_at timestamptz null,
  shipment_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_sync_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_document_id uuid null references public.order_documents(id),
  finance_document_type text not null,
  external_system text null,
  external_id text null,
  sync_status text not null default 'not_synced',
  sync_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_org_status on public.orders(organization_id, status, current_stage);
create index if not exists idx_orders_legacy_contract on public.orders(legacy_contract_id);
create index if not exists idx_orders_source_quote on public.orders(source_quote_id, source_quote_version_id);
create index if not exists idx_order_lines_order on public.order_lines(order_id);
create index if not exists idx_order_lines_source_quote_line on public.order_lines(source_quote_version_line_item_id);
create index if not exists idx_order_approval_gates_order on public.order_approval_gates(order_id, stage_key, gate_type);
create index if not exists idx_order_stage_events_order on public.order_stage_events(order_id, event_at desc);
create index if not exists idx_order_documents_order on public.order_documents(order_id, stage_key, document_type);
create index if not exists idx_trade_requirement_rules_lookup on public.trade_requirement_rules(organization_id, order_type, stage_key, requirement_code);
create index if not exists idx_trade_requirements_order on public.trade_requirements(order_id, stage_key, status);
create index if not exists idx_trade_requirement_sources_order on public.trade_requirement_sources(order_id, source_checked_at desc);
create index if not exists idx_packing_plans_order on public.packing_plans(order_id, status);
create index if not exists idx_packing_plan_lines_plan on public.packing_plan_lines(packing_plan_id);
create index if not exists idx_freight_rate_requests_order on public.freight_rate_requests(order_id, status);
create index if not exists idx_freight_rate_quotes_request on public.freight_rate_quotes(request_id, status);
create index if not exists idx_shipments_order on public.shipments(order_id, status);
create index if not exists idx_finance_sync_records_order on public.finance_sync_records(order_id, sync_status);

alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_approval_gates enable row level security;
alter table public.order_stage_events enable row level security;
alter table public.order_documents enable row level security;
alter table public.trade_requirement_rules enable row level security;
alter table public.trade_requirements enable row level security;
alter table public.trade_requirement_sources enable row level security;
alter table public.packing_plans enable row level security;
alter table public.packing_plan_lines enable row level security;
alter table public.freight_rate_requests enable row level security;
alter table public.freight_rate_quotes enable row level security;
alter table public.shipments enable row level security;
alter table public.finance_sync_records enable row level security;

drop policy if exists orders_org_member_all on public.orders;
create policy orders_org_member_all on public.orders for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists order_lines_org_member_all on public.order_lines;
create policy order_lines_org_member_all on public.order_lines for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists order_approval_gates_org_member_all on public.order_approval_gates;
create policy order_approval_gates_org_member_all on public.order_approval_gates for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists order_stage_events_org_member_all on public.order_stage_events;
create policy order_stage_events_org_member_all on public.order_stage_events for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists order_documents_org_member_all on public.order_documents;
create policy order_documents_org_member_all on public.order_documents for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists trade_requirement_rules_org_member_all on public.trade_requirement_rules;
create policy trade_requirement_rules_org_member_all on public.trade_requirement_rules for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists trade_requirements_org_member_all on public.trade_requirements;
create policy trade_requirements_org_member_all on public.trade_requirements for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists trade_requirement_sources_org_member_all on public.trade_requirement_sources;
create policy trade_requirement_sources_org_member_all on public.trade_requirement_sources for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists packing_plans_org_member_all on public.packing_plans;
create policy packing_plans_org_member_all on public.packing_plans for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists packing_plan_lines_org_member_all on public.packing_plan_lines;
create policy packing_plan_lines_org_member_all on public.packing_plan_lines for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists freight_rate_requests_org_member_all on public.freight_rate_requests;
create policy freight_rate_requests_org_member_all on public.freight_rate_requests for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists freight_rate_quotes_org_member_all on public.freight_rate_quotes;
create policy freight_rate_quotes_org_member_all on public.freight_rate_quotes for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists shipments_org_member_all on public.shipments;
create policy shipments_org_member_all on public.shipments for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

drop policy if exists finance_sync_records_org_member_all on public.finance_sync_records;
create policy finance_sync_records_org_member_all on public.finance_sync_records for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

comment on table public.orders is 'Sprint 8J additive execution order shell. Keeps legacy contracts compatible while enabling approved Orders Full Redesign workflow later.';
comment on table public.order_lines is 'Actual buyer order lines; can differ from quoted lines while preserving quote and contract lineage.';
comment on table public.order_approval_gates is 'Prepare, preview, approve, send, and advance gates for serious order documents.';
comment on table public.trade_requirements is 'Industry-neutral order-stage requirements. Food/agri documents are not universal blockers.';
comment on table public.packing_plans is 'Structured packing sheet source for rate requests, packing lists, and later freight integration.';
comment on table public.finance_sync_records is 'Accounting integration boundary. Draft/proforma docs do not become real invoices by default.';

-- Setu Guru policy note for this schema pass:
-- Orders are execution workflows, not PDFs. Guru may explain or suggest order/trade requirements,
-- but must not approve, waive, clear, send, delete, dispatch, close, sync finance, or attach requirements
-- without explicit human action.

commit;
