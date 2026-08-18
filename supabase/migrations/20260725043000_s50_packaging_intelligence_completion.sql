-- Sprint 50 Packaging Intelligence completion.
-- Applied to project sjzfzloggabsmcuxktnl before this repository record.

alter table public.external_opportunities
  add column if not exists matched_packaging_categories jsonb not null default '[]'::jsonb,
  add column if not exists packaging_use_cases jsonb not null default '[]'::jsonb,
  add column if not exists buyer_need_signals jsonb not null default '[]'::jsonb,
  add column if not exists decision_maker_roles jsonb not null default '[]'::jsonb,
  add column if not exists current_packaging_format text,
  add column if not exists incumbent_supplier_pain text,
  add column if not exists estimated_annual_volume numeric,
  add column if not exists estimated_value_low numeric,
  add column if not exists estimated_value_high numeric,
  add column if not exists value_currency text,
  add column if not exists opportunity_value_basis jsonb not null default '{}'::jsonb,
  add column if not exists print_process_recommendation text,
  add column if not exists print_process_reason text;

create index if not exists idx_external_opportunities_packaging_fit
  on public.external_opportunities (org_id, fit_score desc, review_status, created_at desc);

create table if not exists public.packaging_intelligence_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid references public.ai_recommendations(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  recommendation_type text not null,
  feedback text not null check (feedback in ('helpful','not_helpful','false_positive','completed_elsewhere')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_packaging_intelligence_feedback_org
  on public.packaging_intelligence_feedback (organization_id, recommendation_type, created_at desc);

alter table public.packaging_intelligence_feedback enable row level security;
drop policy if exists packaging_intelligence_feedback_select_member on public.packaging_intelligence_feedback;
create policy packaging_intelligence_feedback_select_member on public.packaging_intelligence_feedback for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists packaging_intelligence_feedback_insert_member on public.packaging_intelligence_feedback;
create policy packaging_intelligence_feedback_insert_member on public.packaging_intelligence_feedback for insert to authenticated with check (public.is_org_member(organization_id) and (created_by is null or created_by = auth.uid()));
drop policy if exists packaging_intelligence_feedback_update_member on public.packaging_intelligence_feedback;
create policy packaging_intelligence_feedback_update_member on public.packaging_intelligence_feedback for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
grant select, insert, update on public.packaging_intelligence_feedback to authenticated;
grant all on public.packaging_intelligence_feedback to service_role;

create table if not exists public.packaging_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid references public.ai_recommendations(id) on delete set null,
  recommendation_type text not null,
  entity_type text not null,
  entity_id uuid,
  event_type text not null check (event_type in ('generated','completed','dismissed','expired','reopened','viewed','action_opened','feedback')),
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_packaging_intelligence_events_org on public.packaging_intelligence_events (organization_id, recommendation_type, event_type, created_at desc);
alter table public.packaging_intelligence_events enable row level security;
drop policy if exists packaging_intelligence_events_select_member on public.packaging_intelligence_events;
create policy packaging_intelligence_events_select_member on public.packaging_intelligence_events for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists packaging_intelligence_events_insert_member on public.packaging_intelligence_events;
create policy packaging_intelligence_events_insert_member on public.packaging_intelligence_events for insert to authenticated with check (public.is_org_member(organization_id) and (actor_user_id is null or actor_user_id = auth.uid()));
grant select, insert on public.packaging_intelligence_events to authenticated;
grant all on public.packaging_intelligence_events to service_role;

create or replace function public.capture_packaging_recommendation_event()
returns trigger language plpgsql set search_path = public as $$
declare v_event_type text;
begin
  if new.recommendation_type not like 'packaging_%' then return new; end if;
  if tg_op = 'INSERT' then v_event_type := 'generated';
  elsif new.status is distinct from old.status then
    v_event_type := case new.status when 'completed' then 'completed' when 'dismissed' then 'dismissed' when 'expired' then 'expired' when 'open' then 'reopened' else null end;
  end if;
  if v_event_type is not null then
    insert into public.packaging_intelligence_events (organization_id,recommendation_id,recommendation_type,entity_type,entity_id,event_type,metadata,actor_user_id)
    values (new.org_id,new.id,new.recommendation_type,new.entity_type,new.entity_id,v_event_type,jsonb_build_object('priority',new.priority,'status',new.status,'source',coalesce(new.metadata->>'source','deterministic_rule')),auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.capture_packaging_recommendation_event() from public;
drop trigger if exists trg_capture_packaging_recommendation_event on public.ai_recommendations;
create trigger trg_capture_packaging_recommendation_event after insert or update of status on public.ai_recommendations for each row execute function public.capture_packaging_recommendation_event();

create or replace view public.packaging_intelligence_learning_metrics_v
with (security_invoker = true) as
select r.org_id as organization_id, r.recommendation_type,
  count(*)::integer as total_recommendations,
  count(*) filter (where r.status='open')::integer as open_count,
  count(*) filter (where r.status='completed')::integer as completed_count,
  count(*) filter (where r.status='dismissed')::integer as dismissed_count,
  count(*) filter (where r.status='expired')::integer as expired_count,
  round(avg(extract(epoch from (coalesce(r.completed_at,r.dismissed_at,r.expired_at)-r.created_at))/3600.0) filter (where coalesce(r.completed_at,r.dismissed_at,r.expired_at) is not null),1) as avg_resolution_hours,
  count(f.id) filter (where f.feedback='helpful')::integer as helpful_count,
  count(f.id) filter (where f.feedback='not_helpful')::integer as not_helpful_count,
  count(f.id) filter (where f.feedback='false_positive')::integer as false_positive_count,
  count(f.id) filter (where f.feedback='completed_elsewhere')::integer as completed_elsewhere_count,
  max(r.updated_at) as latest_recommendation_at
from public.ai_recommendations r
left join public.packaging_intelligence_feedback f on f.recommendation_id=r.id and f.organization_id=r.org_id
where r.recommendation_type like 'packaging_%'
group by r.org_id,r.recommendation_type;
grant select on public.packaging_intelligence_learning_metrics_v to authenticated, service_role;
