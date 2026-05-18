-- 153_patch_2_quote_lifecycle_sent_version.sql
-- Patch 2: Quote lifecycle cleanup
-- - Add quotes.sent_version_id.
-- - Sending sets sent_version_id/current_version_id but not accepted_version_id.
-- - Acceptance sets accepted_version_id.
-- - Order/contract handoff requires accepted status + accepted_version_id.

begin;

alter table public.quotes
  add column if not exists sent_version_id uuid null;

alter table public.quotes
  drop constraint if exists quotes_sent_version_id_fkey;

alter table public.quotes
  add constraint quotes_sent_version_id_fkey
  foreign key (sent_version_id) references public.quote_versions(id) on delete set null;

create index if not exists idx_quotes_sent_version_id on public.quotes(sent_version_id);

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
    sent_version_id = case
      when new.status in ('sent', 'viewed', 'customer_countered') then new.id
      else q.sent_version_id
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

create or replace function public.app_enforce_quote_accepted_version_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.accepted_version_id is distinct from old.accepted_version_id
       and lower(coalesce(new.status, '')) <> 'accepted' then
      new.accepted_version_id := old.accepted_version_id;
    end if;

    if new.sent_version_id is not null
       and not exists (
         select 1
         from public.quote_versions qv
         where qv.id = new.sent_version_id
           and qv.quote_id = new.id
       ) then
      raise exception 'sent_version_id must reference a version of the same quote';
    end if;

    if lower(coalesce(new.status, '')) = 'accepted'
       and new.accepted_version_id is null then
      raise exception 'Accepted quote must reference accepted_version_id';
    end if;

    if new.accepted_version_id is not null
       and not exists (
         select 1
         from public.quote_versions qv
         where qv.id = new.accepted_version_id
           and qv.quote_id = new.id
       ) then
      raise exception 'accepted_version_id must reference a version of the same quote';
    end if;
  end if;
  return new;
end;
$$;

-- Full function body is intentionally mirrored from the live patch applied via Supabase MCP.
-- It sets quotes.sent_version_id on send and never sets accepted_version_id during send.

update public.quotes q
set sent_version_id = coalesce(q.sent_version_id, q.accepted_version_id, q.current_version_id)
where lower(coalesce(q.status, '')) in ('sent', 'accepted', 'rejected')
  and q.sent_version_id is null
  and coalesce(q.accepted_version_id, q.current_version_id) is not null;

commit;
