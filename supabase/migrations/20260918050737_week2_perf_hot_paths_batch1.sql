-- Week 2 performance hardening batch 1
-- Add only high-value FK / lookup indexes on active production paths.
create index if not exists idx_mail_messages_thread_id
  on public.mail_messages (thread_id);

create index if not exists idx_quote_line_items_quote_id
  on public.quote_line_items (quote_id);

create index if not exists idx_lead_attachments_lead_id
  on public.lead_attachments (lead_id);

create index if not exists idx_lead_attachments_organization_id
  on public.lead_attachments (organization_id);

create index if not exists idx_calendar_reminder_deliveries_event_id
  on public.calendar_reminder_deliveries (event_id);

-- Keep the exact same authorization semantics but make auth.uid() an initPlan
-- instead of evaluating it per candidate row.
drop policy if exists quotes_org_access on public.quotes;
create policy quotes_org_access
on public.quotes
as permissive
for all
to public
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = quotes.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = quotes.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists quote_line_items_access on public.quote_line_items;
create policy quote_line_items_access
on public.quote_line_items
as permissive
for all
to public
using (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om
      on om.organization_id = q.organization_id
    where q.id = quote_line_items.quote_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    join public.organization_members om
      on om.organization_id = q.organization_id
    where q.id = quote_line_items.quote_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

-- Remove exact duplicate indexes while retaining the actively-used / constraint-backed copies.
drop index if exists public.idx_leads_org;
drop index if exists public.packaging_proofs_token_idx;

analyze public.mail_messages;
analyze public.quote_line_items;
analyze public.lead_attachments;
analyze public.calendar_reminder_deliveries;
analyze public.quotes;
