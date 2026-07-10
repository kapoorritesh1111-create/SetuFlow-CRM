-- S42-GURU-002: org-scoped Setu Guru recommendation persistence
-- Rollback: drop table public.ai_recommendations cascade;

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  recommendation_type text not null,
  title text not null,
  summary text,
  reason text not null,
  recommended_action text not null,
  action_href text,
  priority text not null default 'medium',
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismiss_reason text,
  completed_at timestamptz,
  expired_at timestamptz,
  constraint ai_recommendations_entity_type_check check (
    entity_type in ('lead','buyer','supplier','quote','order','rfq','trade_event','activity','organization')
  ),
  constraint ai_recommendations_type_check check (
    recommendation_type in (
      'lead_no_outreach',
      'quote_no_follow_up',
      'trade_event_lead_not_contacted',
      'supplier_document_gap',
      'buyer_quote_request',
      'catalog_sent_no_reply',
      'supplier_rfq_overdue',
      'deal_stuck_in_stage'
    )
  ),
  constraint ai_recommendations_priority_check check (priority in ('low','medium','high','urgent')),
  constraint ai_recommendations_status_check check (status in ('open','completed','dismissed','expired')),
  constraint ai_recommendations_title_not_blank check (btrim(title) <> ''),
  constraint ai_recommendations_reason_not_blank check (btrim(reason) <> ''),
  constraint ai_recommendations_action_not_blank check (btrim(recommended_action) <> ''),
  constraint ai_recommendations_lifecycle_check check (
    (status = 'open' and completed_at is null and dismissed_at is null and expired_at is null)
    or (status = 'completed' and completed_at is not null and dismissed_at is null and expired_at is null)
    or (status = 'dismissed' and dismissed_at is not null and nullif(btrim(dismiss_reason), '') is not null and completed_at is null and expired_at is null)
    or (status = 'expired' and expired_at is not null and completed_at is null and dismissed_at is null)
  )
);

create index ai_recommendations_org_status_idx on public.ai_recommendations (org_id, status);
create index ai_recommendations_org_priority_created_idx on public.ai_recommendations (org_id, priority, created_at desc);
create index ai_recommendations_org_entity_idx on public.ai_recommendations (org_id, entity_type, entity_id);
create index ai_recommendations_org_type_idx on public.ai_recommendations (org_id, recommendation_type);
create unique index ai_recommendations_open_dedupe_idx
  on public.ai_recommendations (
    org_id,
    recommendation_type,
    entity_type,
    coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'open';

create trigger ai_recommendations_set_updated_at
before update on public.ai_recommendations
for each row execute function public.set_updated_at();

alter table public.ai_recommendations enable row level security;

create policy ai_recommendations_select_member
on public.ai_recommendations for select
to authenticated
using (public.is_org_member(org_id));

create policy ai_recommendations_insert_member
on public.ai_recommendations for insert
to authenticated
with check (public.is_org_member(org_id) and (created_by is null or created_by = auth.uid()));

create policy ai_recommendations_update_member
on public.ai_recommendations for update
to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

create policy ai_recommendations_delete_member
on public.ai_recommendations for delete
to authenticated
using (public.is_org_member(org_id));

grant select, insert, update, delete on public.ai_recommendations to authenticated;
revoke all on public.ai_recommendations from anon;

comment on table public.ai_recommendations is 'Org-scoped, explainable Setu Guru recommendations connected to user-approved CRM actions.';
comment on column public.ai_recommendations.reason is 'Plain-language explanation of why the recommendation is shown.';
comment on column public.ai_recommendations.recommended_action is 'Single user-approved CRM action suggested by Setu Guru.';