-- 045_enable_rls_core_tables.sql
-- Baseline org-scoped RLS for the main CRM tables used in this repo.
-- Sprint 18 audit note: later execution-table RLS is owned by the Orders
-- execution migrations because those tables do not exist at migration 045.
-- Live verification for SF-18-012 confirmed RLS enabled for order_lines,
-- packing_plans, freight_booking_events, finance_integration_events, and
-- trade_requirements, with policies present for each table.

alter table public.organization_members enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_markets enable row level security;
alter table public.lead_product_interests enable row level security;
alter table public.lead_follow_ups enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.markets enable row level security;
alter table public.countries enable row level security;
alter table public.trade_events enable row level security;
alter table public.rfqs enable row level security;
alter table public.rfq_line_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_line_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists organization_members_org_access on public.organization_members;
create policy organization_members_org_access on public.organization_members
for select using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists roles_org_access on public.roles;
create policy roles_org_access on public.roles
for select using (
  organization_id is null
  or exists (
    select 1
    from public.organization_members om
    where om.organization_id = roles.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists user_roles_org_access on public.user_roles;
create policy user_roles_org_access on public.user_roles
for select using (
  exists (
    select 1
    from public.organization_members target_om
    join public.organization_members viewer_om on viewer_om.organization_id = target_om.organization_id
    where target_om.id = user_roles.organization_member_id
      and viewer_om.user_id = auth.uid()
      and viewer_om.is_active = true
  )
);

drop policy if exists leads_org_access on public.leads;
create policy leads_org_access on public.leads
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = leads.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = leads.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists lead_markets_access on public.lead_markets;
create policy lead_markets_access on public.lead_markets
for all using (
  exists (
    select 1
    from public.leads l
    join public.organization_members om on om.organization_id = l.organization_id
    where l.id = lead_markets.lead_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.leads l
    join public.organization_members om on om.organization_id = l.organization_id
    where l.id = lead_markets.lead_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists lead_product_interests_access on public.lead_product_interests;
create policy lead_product_interests_access on public.lead_product_interests
for all using (
  exists (
    select 1
    from public.leads l
    join public.organization_members om on om.organization_id = l.organization_id
    where l.id = lead_product_interests.lead_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.leads l
    join public.organization_members om on om.organization_id = l.organization_id
    where l.id = lead_product_interests.lead_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists lead_follow_ups_org_access on public.lead_follow_ups;
create policy lead_follow_ups_org_access on public.lead_follow_ups
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_follow_ups.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_follow_ups.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists lead_activities_org_access on public.lead_activities;
create policy lead_activities_org_access on public.lead_activities
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_activities.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_activities.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists lead_stage_history_org_access on public.lead_stage_history;
create policy lead_stage_history_org_access on public.lead_stage_history
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_stage_history.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_stage_history.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists products_org_access on public.products;
create policy products_org_access on public.products
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = products.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = products.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists product_categories_org_access on public.product_categories;
create policy product_categories_org_access on public.product_categories
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = product_categories.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists markets_org_access on public.markets;
create policy markets_org_access on public.markets
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = markets.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = markets.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists countries_org_access on public.countries;
create policy countries_org_access on public.countries
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = countries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = countries.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists trade_events_org_access on public.trade_events;
create policy trade_events_org_access on public.trade_events
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = trade_events.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = trade_events.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists rfqs_org_access on public.rfqs;
create policy rfqs_org_access on public.rfqs
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = rfqs.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = rfqs.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists rfq_line_items_access on public.rfq_line_items;
create policy rfq_line_items_access on public.rfq_line_items
for all using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_members om on om.organization_id = r.organization_id
    where r.id = rfq_line_items.rfq_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.rfqs r
    join public.organization_members om on om.organization_id = r.organization_id
    where r.id = rfq_line_items.rfq_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists quotes_org_access on public.quotes;
create policy quotes_org_access on public.quotes
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = quotes.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = quotes.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists quote_line_items_access on public.quote_line_items;
create policy quote_line_items_access on public.quote_line_items
for all using (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_line_items.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_line_items.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists contracts_org_access on public.contracts;
create policy contracts_org_access on public.contracts
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = contracts.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = contracts.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists contract_line_items_access on public.contract_line_items;
create policy contract_line_items_access on public.contract_line_items
for all using (
  exists (
    select 1
    from public.contracts c
    join public.organization_members om on om.organization_id = c.organization_id
    where c.id = contract_line_items.contract_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.contracts c
    join public.organization_members om on om.organization_id = c.organization_id
    where c.id = contract_line_items.contract_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists audit_logs_org_access on public.audit_logs;
create policy audit_logs_org_access on public.audit_logs
for select using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = audit_logs.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);
