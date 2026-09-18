-- Paid-client hardening Batch 1: align Growth Agent packaging recommendations with the DB taxonomy.
-- Keep the constraint strict; add only entity types intentionally emitted by packaging-recommendations.ts.
alter table public.ai_recommendations
  drop constraint if exists ai_recommendations_entity_type_check;

alter table public.ai_recommendations
  add constraint ai_recommendations_entity_type_check
  check (
    entity_type = any (
      array[
        'lead'::text,
        'buyer'::text,
        'supplier'::text,
        'quote'::text,
        'order'::text,
        'rfq'::text,
        'trade_event'::text,
        'activity'::text,
        'organization'::text,
        'external_opportunity'::text,
        'packaging_line'::text,
        'packaging_template'::text,
        'packaging_order'::text
      ]
    )
  );
