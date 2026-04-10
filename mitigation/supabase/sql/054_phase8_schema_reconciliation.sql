-- Phase 8 schema reconciliation and hardening.
-- Align saved-view coverage with the new operator workspaces,
-- add AI draft indexing, and reconcile contract progression guards
-- with the current contracts status model.

alter table public.saved_views drop constraint if exists saved_views_entity_type_check;
alter table public.saved_views
  add constraint saved_views_entity_type_check
  check (
    entity_type = any (
      array[
        'leads'::text,
        'accounts'::text,
        'pipeline'::text,
        'rfqs'::text,
        'quotes'::text,
        'products'::text,
        'catalog'::text,
        'documents'::text,
        'compliance'::text,
        'tasks'::text,
        'trade_events'::text,
        'integrations'::text,
        'ai_suggestions'::text
      ]
    )
  );

alter table public.view_preferences drop constraint if exists view_preferences_entity_type_check;
alter table public.view_preferences
  add constraint view_preferences_entity_type_check
  check (
    entity_type = any (
      array[
        'leads'::text,
        'accounts'::text,
        'pipeline'::text,
        'rfqs'::text,
        'quotes'::text,
        'products'::text,
        'catalog'::text,
        'documents'::text,
        'compliance'::text,
        'tasks'::text,
        'trade_events'::text,
        'integrations'::text,
        'ai_suggestions'::text
      ]
    )
  );

create index if not exists ai_suggestions_lead_status_created_idx
  on public.ai_suggestions (lead_id, status, created_at desc);

create index if not exists integration_events_status_created_idx
  on public.integration_events (integration_id, status, created_at desc);

create or replace function public.app_assert_contract_progression_ready()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.status, '')) in ('signed', 'active', 'completed') then
    if public.app_contract_progression_blocker_count(new.organization_id, new.lead_id) > 0 then
      raise exception 'Contract progression is blocked until required documents and compliance items are resolved.';
    end if;
  end if;
  return new;
end;
$$;
