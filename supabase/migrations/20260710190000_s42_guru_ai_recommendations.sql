-- Sprint 42 - Setu Guru Growth Center Foundation
-- S42-GURU-002: org-scoped, explainable AI recommendations

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  recommendation_type text not null,
  title text not null,
  summary text,
  recommended_action text,
  priority text not null default 'medium',
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismiss_reason text,
  completed_at timestamptz,

  constraint ai_recommendations_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint ai_recommendations_status_check
    check (status in ('open', 'completed', 'dismissed', 'expired')),
  constraint ai_recommendations_type_check
    check (recommendation_type in (
      'follow_up',
      'create_quote',
      'send_catalog',
      'research_lead',
      'request_supplier_docs',
      'create_rfq',
      'move_stage',
      'trade_event_followup'
    )),
  constraint ai_recommendations_completion_state_check
    check (
      (status = 'completed' and completed_at is not null)
      or status <> 'completed'
    ),
  constraint ai_recommendations_dismissal_state_check
    check (
      (status = 'dismissed' and dismissed_at is not null)
      or status <> 'dismissed'
    )
);

comment on table public.ai_recommendations is
  'Org-scoped Setu Guru recommendations grounded in CRM data and connected to user-approved CRM actions.';

comment on column public.ai_recommendations.summary is
  'Plain-language reason explaining why the recommendation is being shown.';

comment on column public.ai_recommendations.recommended_action is
  'User-approved CRM action suggested by Setu Guru. Phase 1 never sends externally without approval.';

create index if not exists ai_recommendations_org_status_priority_idx
  on public.ai_recommendations (org_id, status, priority, created_at desc);

create index if not exists ai_recommendations_org_entity_idx
  on public.ai_recommendations (org_id, entity_type, entity_id);

create index if not exists ai_recommendations_org_type_idx
  on public.ai_recommendations (org_id, recommendation_type, status);

create unique index if not exists ai_recommendations_open_dedupe_idx
  on public.ai_recommendations (org_id, entity_type, entity_id, recommendation_type)
  where status = 'open' and entity_id is not null;

create or replace function public.set_ai_recommendations_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_recommendations_updated_at on public.ai_recommendations;
create trigger set_ai_recommendations_updated_at
before update on public.ai_recommendations
for each row execute function public.set_ai_recommendations_updated_at();

alter table public.ai_recommendations enable row level security;

revoke all on table public.ai_recommendations from anon;
grant select, insert, update, delete on table public.ai_recommendations to authenticated;

-- Membership helper remains local to this migration so policies follow the
-- repository's canonical organization_members relationship.
create or replace function public.is_ai_recommendation_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and coalesce(om.is_active, true) = true
  );
$$;

revoke all on function public.is_ai_recommendation_org_member(uuid) from public;
grant execute on function public.is_ai_recommendation_org_member(uuid) to authenticated;

drop policy if exists ai_recommendations_select_org_member on public.ai_recommendations;
create policy ai_recommendations_select_org_member
on public.ai_recommendations
for select
to authenticated
using (public.is_ai_recommendation_org_member(org_id));

drop policy if exists ai_recommendations_insert_org_member on public.ai_recommendations;
create policy ai_recommendations_insert_org_member
on public.ai_recommendations
for insert
to authenticated
with check (
  public.is_ai_recommendation_org_member(org_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists ai_recommendations_update_org_member on public.ai_recommendations;
create policy ai_recommendations_update_org_member
on public.ai_recommendations
for update
to authenticated
using (public.is_ai_recommendation_org_member(org_id))
with check (public.is_ai_recommendation_org_member(org_id));

drop policy if exists ai_recommendations_delete_org_member on public.ai_recommendations;
create policy ai_recommendations_delete_org_member
on public.ai_recommendations
for delete
to authenticated
using (public.is_ai_recommendation_org_member(org_id));

-- Rollback notes:
-- drop table public.ai_recommendations cascade;
-- drop function public.is_ai_recommendation_org_member(uuid);
-- drop function public.set_ai_recommendations_updated_at();
