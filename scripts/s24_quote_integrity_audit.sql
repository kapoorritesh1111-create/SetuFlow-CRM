-- Sprint 24 S24-DATA-204 read-only quote/version/order integrity audit.
with line_counts as (
  select quote_id, count(*)::int as line_count from public.quote_line_items group by quote_id
), version_line_counts as (
  select qv.id as quote_version_id, qv.quote_id, count(qvli.id)::int as version_line_count
  from public.quote_versions qv
  left join public.quote_version_line_items qvli on qvli.quote_version_id = qv.id
  group by qv.id, qv.quote_id
), handoffs as (
  select q.id as quote_id, count(distinct o.id)::int as order_count, count(distinct c.id)::int as contract_count
  from public.quotes q
  left join public.orders o on o.source_quote_id = q.id
  left join public.contracts c on c.quote_id = q.id
  group by q.id
)
select
  q.id,
  q.quote_number,
  q.status,
  q.current_version_id,
  cv.version_no as current_version_no,
  coalesce(lc.line_count, 0) as quote_line_count,
  coalesce(vlc.version_line_count, 0) as current_version_line_snapshot_count,
  coalesce(h.order_count, 0) as order_handoff_count,
  coalesce(h.contract_count, 0) as contract_handoff_count,
  case
    when q.current_version_id is null and q.status = 'draft' then 'draft_missing_current_version'
    when q.current_version_id is null and q.status in ('sent','accepted') then 'locked_missing_current_version'
    when q.current_version_id is not null and cv.id is null then 'current_version_mismatch'
    when coalesce(lc.line_count, 0) = 0 then 'zero_quote_line_items'
    when q.status = 'accepted' and coalesce(h.order_count, 0) = 0 and coalesce(h.contract_count, 0) = 0 then 'accepted_missing_handoff'
    when q.current_version_id is not null and coalesce(vlc.version_line_count, 0) = 0 then 'current_version_missing_line_snapshots'
    else 'ok'
  end as audit_flag
from public.quotes q
left join line_counts lc on lc.quote_id = q.id
left join public.quote_versions cv on cv.id = q.current_version_id and cv.quote_id = q.id
left join version_line_counts vlc on vlc.quote_version_id = q.current_version_id
left join handoffs h on h.quote_id = q.id
where q.current_version_id is null
   or cv.id is null
   or coalesce(lc.line_count, 0) = 0
   or (q.status = 'accepted' and coalesce(h.order_count, 0) = 0 and coalesce(h.contract_count, 0) = 0)
   or (q.current_version_id is not null and coalesce(vlc.version_line_count, 0) = 0)
order by q.updated_at desc nulls last;
