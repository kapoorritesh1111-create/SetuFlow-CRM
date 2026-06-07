-- Sprint 24 S24-DATA-204 quote/version/order integrity audit and safe backfill.
-- Read-only audit query:
-- with line_counts as (
--   select quote_id, count(*)::int as line_count from public.quote_line_items group by quote_id
-- ), handoffs as (
--   select q.id as quote_id, count(distinct o.id)::int as order_count, count(distinct c.id)::int as contract_count
--   from public.quotes q
--   left join public.orders o on o.source_quote_id = q.id
--   left join public.contracts c on c.quote_id = q.id
--   group by q.id
-- )
-- select
--   count(*) filter (where q.status = 'draft' and q.current_version_id is null)::int as draft_missing_current_version,
--   count(*) filter (where q.status in ('sent','accepted') and q.current_version_id is null)::int as locked_missing_current_version,
--   count(*) filter (where coalesce(lc.line_count,0)=0)::int as quotes_with_zero_line_items,
--   count(*) filter (where q.current_version_id is not null and qv.id is null)::int as current_version_mismatch,
--   count(*) filter (where q.status='accepted' and coalesce(h.order_count,0)=0 and coalesce(h.contract_count,0)=0)::int as accepted_missing_handoff,
--   count(*) filter (where q.status='accepted' and coalesce(lc.line_count,0)=0)::int as accepted_zero_line_items
-- from public.quotes q
-- left join line_counts lc on lc.quote_id=q.id
-- left join public.quote_versions qv on qv.id=q.current_version_id and qv.quote_id=q.id
-- left join handoffs h on h.quote_id=q.id;

-- Safe live backfill applied only where a draft quote has exactly one existing version and no current_version_id.
-- This does not alter sent/accepted/rejected/expired quote history or customer-facing versions.
with candidates as (
  select q.id as quote_id, (array_agg(qv.id order by qv.version_no desc nulls last, qv.created_at desc nulls last))[1] as version_id
  from public.quotes q
  join public.quote_versions qv on qv.quote_id = q.id
  where q.status = 'draft'
    and q.current_version_id is null
  group by q.id
  having count(qv.id) = 1
)
update public.quotes q
set current_version_id = candidates.version_id,
    updated_at = now()
from candidates
where q.id = candidates.quote_id
  and q.current_version_id is null;
