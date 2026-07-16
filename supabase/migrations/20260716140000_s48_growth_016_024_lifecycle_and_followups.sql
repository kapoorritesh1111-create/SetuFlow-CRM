-- Sprint 48 Growth Center completion, part 2 (S48-GROWTH-016 through S48-GROWTH-024)

-- 1. Extend external_opportunities lifecycle with post-outreach states and follow-up linkage.
alter table public.external_opportunities
  drop constraint if exists external_opportunities_review_status_check;
alter table public.external_opportunities
  add constraint external_opportunities_review_status_check
  check (review_status in (
    'new','reviewing','verified','rejected','approved','outreach_ready',
    'contacted','responded','qualified','nurture',
    'converted','dismissed','archived'
  ));

alter table public.external_opportunities
  add column if not exists contacted_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists qualified_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists follow_up_recommendation_id uuid references public.ai_recommendations(id) on delete set null;

-- 2. Allow Growth Center follow-ups and external-opportunity recommendations to use the existing
-- Work Queue (ai_recommendations) rather than introducing a parallel task system, so they appear
-- in Today/the right queue and Completed history automatically (S48-GROWTH-018/022).
alter table public.ai_recommendations
  drop constraint if exists ai_recommendations_entity_type_check;
alter table public.ai_recommendations
  add constraint ai_recommendations_entity_type_check
  check (entity_type = any (array['lead','buyer','supplier','quote','order','rfq','trade_event','activity','organization','external_opportunity']));

alter table public.ai_recommendations
  drop constraint if exists ai_recommendations_type_check;
alter table public.ai_recommendations
  add constraint ai_recommendations_type_check
  check (recommendation_type = any (array[
    'lead_no_outreach','quote_no_follow_up','trade_event_lead_not_contacted','supplier_document_gap',
    'buyer_quote_request','catalog_sent_no_reply','supplier_rfq_overdue','deal_stuck_in_stage',
    'growth_outreach_follow_up'
  ]));

create index if not exists external_opportunities_follow_up_idx
  on public.external_opportunities (org_id, next_follow_up_at)
  where next_follow_up_at is not null;
