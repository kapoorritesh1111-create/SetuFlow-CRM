-- PR-NS-18: Quote/version status reconciliation support
-- Purpose:
--   Live verification on 2026-04-30 found quote Q-00025 / b6f8111a-3b32-456d-92f0-412c898bf13b
--   with parent quotes.status = 'sent' while its current quote_versions.status remained 'draft'.
--   This migration safely reconciles parent quote statuses with their current quote version for
--   terminal/outbound statuses used by the golden demo path.
--
-- Safety:
--   - Idempotent.
--   - Only touches the current_version_id attached to the quote.
--   - Only changes quote_versions currently in draft/in_review/approved when the parent quote is
--     already sent/accepted/rejected.
--   - Does not reopen line/item editing.
--   - Does not create contracts; accepted quote -> contract handoff remains guarded by
--     app_ensure_contract_for_accepted_quote_tx through application action flow.

begin;

with mismatched_current_versions as (
  select
    q.id as quote_id,
    q.current_version_id as quote_version_id,
    q.status as quote_status,
    q.updated_at as quote_updated_at,
    qv.status as quote_version_status
  from public.quotes q
  join public.quote_versions qv on qv.id = q.current_version_id and qv.quote_id = q.id
  where q.status in ('sent', 'accepted', 'rejected')
    and qv.status is distinct from q.status
    and qv.status in ('draft', 'compiled', 'approval_pending', 'approved', 'in_review')
)
update public.quote_versions qv
set
  status = m.quote_status,
  sent_at = case
    when m.quote_status in ('sent', 'accepted') and qv.sent_at is null then coalesce(m.quote_updated_at, now())
    else qv.sent_at
  end,
  updated_at = now()
from mismatched_current_versions m
where qv.id = m.quote_version_id;

update public.quotes q
set
  accepted_version_id = case
    when q.status = 'accepted' and q.accepted_version_id is null then q.current_version_id
    else q.accepted_version_id
  end,
  updated_at = now()
where q.status = 'accepted'
  and q.current_version_id is not null
  and q.accepted_version_id is null;

commit;

-- Verification query after applying:
-- select q.id, q.quote_number, q.status as quote_status, q.current_version_id,
--        qv.status as version_status, qv.sent_at
-- from public.quotes q
-- join public.quote_versions qv on qv.id = q.current_version_id
-- where q.status in ('sent', 'accepted', 'rejected')
--   and qv.status is distinct from q.status;
