-- 065_pricing_quote_engine_rls_hardening.sql
-- Purpose: extend org-scoped RLS coverage to pricing-engine and document-version tables
-- so the versioned pricing workflow is protected with the same membership model as core CRM tables.

begin;

alter table public.quote_versions enable row level security;
alter table public.quote_version_line_items enable row level security;
alter table public.quote_pricing_snapshots enable row level security;
alter table public.pricing_engine_settings enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.quote_negotiation_events enable row level security;

drop policy if exists quote_versions_org_access on public.quote_versions;
create policy quote_versions_org_access on public.quote_versions
for all using (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_versions.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_versions.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists quote_version_line_items_org_access on public.quote_version_line_items;
create policy quote_version_line_items_org_access on public.quote_version_line_items
for all using (
  exists (
    select 1
    from public.quote_versions qv
    join public.quotes q on q.id = qv.quote_id
    join public.organization_members om on om.organization_id = q.organization_id
    where qv.id = quote_version_line_items.quote_version_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quote_versions qv
    join public.quotes q on q.id = qv.quote_id
    join public.organization_members om on om.organization_id = q.organization_id
    where qv.id = quote_version_line_items.quote_version_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists quote_pricing_snapshots_org_access on public.quote_pricing_snapshots;
create policy quote_pricing_snapshots_org_access on public.quote_pricing_snapshots
for all using (
  exists (
    select 1
    from public.quote_versions qv
    join public.quotes q on q.id = qv.quote_id
    join public.organization_members om on om.organization_id = q.organization_id
    where qv.id = quote_pricing_snapshots.quote_version_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quote_versions qv
    join public.quotes q on q.id = qv.quote_id
    join public.organization_members om on om.organization_id = q.organization_id
    where qv.id = quote_pricing_snapshots.quote_version_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists pricing_engine_settings_org_access on public.pricing_engine_settings;
create policy pricing_engine_settings_org_access on public.pricing_engine_settings
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = pricing_engine_settings.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = pricing_engine_settings.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists documents_org_access on public.documents;
create policy documents_org_access on public.documents
for all using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = documents.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists document_versions_org_access on public.document_versions;
create policy document_versions_org_access on public.document_versions
for all using (
  exists (
    select 1
    from public.documents d
    join public.organization_members om on om.organization_id = d.organization_id
    where d.id = document_versions.document_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.documents d
    join public.organization_members om on om.organization_id = d.organization_id
    where d.id = document_versions.document_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

drop policy if exists quote_negotiation_events_org_access on public.quote_negotiation_events;
create policy quote_negotiation_events_org_access on public.quote_negotiation_events
for all using (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_negotiation_events.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om on om.organization_id = q.organization_id
    where q.id = quote_negotiation_events.quote_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

commit;
