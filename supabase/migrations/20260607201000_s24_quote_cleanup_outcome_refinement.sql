-- S24-205 through S24-208 follow-up refinement.
-- This migration is intentionally additive / corrective. It does not delete quote history.

comment on column public.quotes.lifecycle_outcome is
  'Quote lifecycle outcome. Follow-up refinement: accepted zero-line historical records should be treated by UI as cleanup_void_candidate, not customer-level risk, unless an operational handoff is attempted.';

-- Reclassify accepted zero-line / zero-value quotes that were previously backfilled as follow-up/risk
-- into a cleanup outcome. This supports UI wording without deleting the record.
update public.quotes q
set lifecycle_outcome = 'cleanup_void_candidate',
    archive_reason = coalesce(q.archive_reason, 'Zero-line accepted quote retained for history; cleanup/void review recommended.'),
    updated_at = now()
where q.status = 'accepted'
  and coalesce(q.lifecycle_outcome, '') in ('sent_follow_up', 'data_risk_review', 'accepted_handoff', '')
  and not exists (
    select 1 from public.quote_line_items qli
    where qli.quote_id = q.id
  );

insert into public.quote_lifecycle_events (organization_id, quote_id, lead_id, event_type, outcome, actor_name, actor_type, message, metadata)
select q.organization_id,
       q.id,
       q.lead_id,
       'cleanup_reclassification',
       'cleanup_void_candidate',
       'Sprint 24 follow-up migration',
       'system',
       'Accepted zero-line quote reclassified as cleanup/void candidate rather than customer-level risk.',
       jsonb_build_object('source', '20260607201000_s24_quote_cleanup_outcome_refinement')
from public.quotes q
where q.lifecycle_outcome = 'cleanup_void_candidate'
  and not exists (
    select 1
    from public.quote_lifecycle_events e
    where e.quote_id = q.id
      and e.event_type = 'cleanup_reclassification'
  );
