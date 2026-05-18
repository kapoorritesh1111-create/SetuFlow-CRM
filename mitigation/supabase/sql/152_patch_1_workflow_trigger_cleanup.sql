-- 152_patch_1_workflow_trigger_cleanup.sql
-- Patch 1: workflow trigger cleanup
-- - Remove duplicate updated_at triggers on key tables.
-- - Stop automatic lead coverage writes from generic lead text edits.
-- - Collapse quote_versions -> quotes parent sync into a single canonical trigger.

begin;

-- Keep one canonical updated_at trigger per workflow-critical table.
drop trigger if exists trg_updated_at_leads on public.leads;
drop trigger if exists trg_updated_at_quotes on public.quotes;
drop trigger if exists trg_updated_at_documents on public.documents;

-- Product/market coverage should be written by explicit save coverage/save lead commands.
drop trigger if exists trg_setuflow_auto_link_lead_coverage on public.leads;

-- Replace overlapping quote parent sync triggers with one canonical trigger.
drop trigger if exists trg_quote_versions_sync_quote_current_version on public.quote_versions;
drop trigger if exists trg_quote_versions_sync_quote_from_version on public.quote_versions;
drop trigger if exists trg_quote_versions_sync_quote_status on public.quote_versions;

create or replace function public.app_sync_quote_parent_from_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_status text;
begin
  v_parent_status := case new.status
    when 'draft' then 'draft'
    when 'compiled' then 'in_review'
    when 'approval_pending' then 'in_review'
    when 'approved' then 'in_review'
    when 'sent' then 'sent'
    when 'viewed' then 'sent'
    when 'customer_countered' then 'negotiating'
    when 'accepted' then 'accepted'
    when 'rejected' then 'rejected'
    when 'expired' then 'expired'
    when 'cancelled' then 'cancelled'
    when 'superseded' then null
    else null
  end;

  update public.quotes q
  set
    current_version_id = case
      when new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then new.id
      else q.current_version_id
    end,
    version_no = case
      when new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then new.version_no
      else q.version_no
    end,
    pricing_basis = case
      when new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then new.pricing_basis
      else q.pricing_basis
    end,
    display_currency = case
      when new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then new.display_currency
      else q.display_currency
    end,
    valid_until = case
      when new.status in ('compiled', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted') then coalesce(new.valid_until, q.valid_until)
      else q.valid_until
    end,
    status = coalesce(v_parent_status, q.status),
    accepted_version_id = case
      when new.status = 'accepted' then new.id
      else q.accepted_version_id
    end,
    updated_at = now()
  where q.id = new.quote_id;

  return new;
end;
$$;

create trigger trg_quote_versions_sync_quote_parent
  after insert or update on public.quote_versions
  for each row
  execute function public.app_sync_quote_parent_from_version();

commit;
