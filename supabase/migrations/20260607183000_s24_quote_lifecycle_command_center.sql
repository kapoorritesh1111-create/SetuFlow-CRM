-- Sprint 24 enhancements S24-QUOTES-205 through S24-QUOTES-208
-- Quote lifecycle command center / archive / Setu Guru mitigation.
-- Additive only: no destructive data mutation and no sent/accepted commercial records are rewritten.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'archived_at'
  ) then
    alter table public.quotes add column archived_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'archive_reason'
  ) then
    alter table public.quotes add column archive_reason text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'lifecycle_outcome'
  ) then
    alter table public.quotes add column lifecycle_outcome text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'follow_up_at'
  ) then
    alter table public.quotes add column follow_up_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes' and column_name = 'last_customer_response_at'
  ) then
    alter table public.quotes add column last_customer_response_at timestamptz;
  end if;
end $$;

comment on column public.quotes.archived_at is 'Sprint 24 enhancement: timestamp when rejected/expired/non-active quote leaves active quote workspace.';
comment on column public.quotes.archive_reason is 'Sprint 24 enhancement: reason quote was archived or hidden from active workspace.';
comment on column public.quotes.lifecycle_outcome is 'Sprint 24 enhancement: lifecycle outcome such as sent_follow_up, revision_requested, accepted_handoff, rejected_archived, expired_archived, data_risk_review.';
comment on column public.quotes.follow_up_at is 'Sprint 24 enhancement: next scheduled quote follow-up timestamp.';
comment on column public.quotes.last_customer_response_at is 'Sprint 24 enhancement: timestamp of latest customer response captured for quote lifecycle.';

create table if not exists public.quote_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  lead_id uuid,
  event_type text not null,
  outcome text,
  actor_name text,
  actor_type text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quote_lifecycle_events_quote_created_idx on public.quote_lifecycle_events (quote_id, created_at desc);
create index if not exists quote_lifecycle_events_org_outcome_idx on public.quote_lifecycle_events (organization_id, outcome, created_at desc);

comment on table public.quote_lifecycle_events is 'Sprint 24 enhancements 205-208: append-only lifecycle log for quote outcomes, revisions, expiry/archive, and order handoff transitions.';

insert into public.quote_lifecycle_events (organization_id, quote_id, lead_id, event_type, outcome, actor_name, actor_type, message, metadata)
select q.organization_id, q.id, q.lead_id, 's24_lifecycle_backfill',
  case
    when q.status = 'accepted' and coalesce(lines.line_count, 0) = 0 then 'data_risk_review'
    when q.status = 'accepted' then 'accepted_handoff'
    when q.status = 'sent' then 'sent_follow_up'
    when q.status in ('rejected','expired') then q.status || '_archived'
    else q.status
  end,
  'Sprint 24 enhancement migration', 'system',
  'Initial lifecycle event backfilled from quote status for S24-205 through S24-208.',
  jsonb_build_object('quote_status', q.status, 'line_count', coalesce(lines.line_count, 0), 'source', 's24_205_208_live_mitigation')
from public.quotes q
left join (
  select quote_id, count(*) as line_count
  from public.quote_line_items
  group by quote_id
) lines on lines.quote_id = q.id
where q.status in ('sent','accepted','rejected','expired')
  and not exists (
    select 1 from public.quote_lifecycle_events e
    where e.quote_id = q.id and e.event_type = 's24_lifecycle_backfill'
  );

with line_counts as (
  select q.id as quote_id, coalesce(count(qli.id), 0) as line_count
  from public.quotes q
  left join public.quote_line_items qli on qli.quote_id = q.id
  group by q.id
)
update public.quotes q
set lifecycle_outcome = case
    when q.status = 'accepted' and lc.line_count = 0 then 'data_risk_review'
    when q.status = 'accepted' then 'accepted_handoff'
    when q.status = 'sent' then 'sent_follow_up'
    when q.status = 'rejected' then 'rejected_archived'
    when q.status = 'expired' then 'expired_archived'
    else q.lifecycle_outcome
  end,
  archived_at = case when q.status in ('rejected','expired') and q.archived_at is null then now() else q.archived_at end,
  archive_reason = case when q.status in ('rejected','expired') and q.archive_reason is null then 'Archived by Sprint 24 quote lifecycle policy.' else q.archive_reason end,
  updated_at = now()
from line_counts lc
where q.id = lc.quote_id
  and q.status in ('sent','accepted','rejected','expired');
