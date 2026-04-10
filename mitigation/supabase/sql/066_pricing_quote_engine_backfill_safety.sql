-- 066_pricing_quote_engine_backfill_safety.sql
-- Purpose: make quote-number backfill rerunnable and collision-safe, and provide
-- post-migration reconciliation checks for pilot readiness.

begin;

create or replace function public.generate_quote_number(p_organization_id uuid)
returns text
language plpgsql
as $$
declare
  v_lock_key bigint;
  v_next integer;
begin
  v_lock_key := ('x' || substr(md5('quote-number:' || coalesce(p_organization_id::text, '')), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  select coalesce(
    max(
      case
        when quote_number is null then null
        when regexp_replace(quote_number, '[^0-9]', '', 'g') = '' then null
        else regexp_replace(quote_number, '[^0-9]', '', 'g')::integer
      end
    ),
    0
  ) + 1
  into v_next
  from public.quotes
  where organization_id = p_organization_id;

  return 'Q-' || lpad(v_next::text, 5, '0');
end;
$$;

with quote_number_gaps as (
  select
    q.id,
    q.organization_id,
    row_number() over (partition by q.organization_id order by q.created_at, q.id) as gap_seq
  from public.quotes q
  where q.quote_number is null or btrim(q.quote_number) = ''
),
existing_quote_max as (
  select
    q.organization_id,
    coalesce(
      max(
        case
          when q.quote_number is null then null
          when regexp_replace(q.quote_number, '[^0-9]', '', 'g') = '' then null
          else regexp_replace(q.quote_number, '[^0-9]', '', 'g')::integer
        end
      ),
      0
    ) as max_existing_no
  from public.quotes q
  group by q.organization_id
),
assigned_quote_numbers as (
  select
    g.id,
    'Q-' || lpad((coalesce(m.max_existing_no, 0) + g.gap_seq)::text, 5, '0') as quote_number
  from quote_number_gaps g
  left join existing_quote_max m on m.organization_id = g.organization_id
)
update public.quotes q
set quote_number = a.quote_number
from assigned_quote_numbers a
where q.id = a.id
  and (q.quote_number is null or btrim(q.quote_number) = '');

commit;

-- Post-run reconciliation checks:
-- 1) Missing quote numbers
-- select organization_id, count(*) as missing_quote_numbers
-- from public.quotes
-- where quote_number is null or btrim(quote_number) = ''
-- group by organization_id;

-- 2) Duplicate quote numbers inside an organization
-- select organization_id, quote_number, count(*) as duplicate_count
-- from public.quotes
-- where quote_number is not null and btrim(quote_number) <> ''
-- group by organization_id, quote_number
-- having count(*) > 1;

-- 3) Quotes with current_version_id that does not exist
-- select q.organization_id, count(*) as dangling_current_versions
-- from public.quotes q
-- left join public.quote_versions qv on qv.id = q.current_version_id
-- where q.current_version_id is not null and qv.id is null
-- group by q.organization_id;

-- 4) Quote versions missing snapshots
-- select q.organization_id, count(*) as versions_without_snapshot
-- from public.quote_versions qv
-- join public.quotes q on q.id = qv.quote_id
-- left join public.quote_pricing_snapshots qps on qps.quote_version_id = qv.id
-- where qps.id is null
-- group by q.organization_id;

-- 5) Sent versions without linked documents
-- select q.organization_id, count(*) as sent_versions_without_pdf
-- from public.quote_versions qv
-- join public.quotes q on q.id = qv.quote_id
-- where qv.status = 'sent' and qv.pdf_document_id is null
-- group by q.organization_id;
