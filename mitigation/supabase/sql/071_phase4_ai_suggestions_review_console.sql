-- Phase 4: AI review console hardening
-- Goal:
--   Extend ai_suggestions from a simple draft stub into a reviewable,
--   org-scoped workflow table that can persist operator notes, richer states,
--   and communications linkage without introducing autonomy.

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  lead_id uuid not null references public.leads(id),
  suggestion_type text not null,
  target_entity_type text,
  target_entity_id uuid,
  content text not null,
  draft_subject text,
  draft_body text,
  rationale text,
  prompt_context jsonb not null default '{}'::jsonb,
  status text not null default 'generated',
  suggested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_outcome text,
  operator_notes text,
  applied_communication_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_suggestions
  add column if not exists organization_id uuid,
  add column if not exists target_entity_type text,
  add column if not exists target_entity_id uuid,
  add column if not exists draft_subject text,
  add column if not exists draft_body text,
  add column if not exists rationale text,
  add column if not exists prompt_context jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decision_outcome text,
  add column if not exists operator_notes text,
  add column if not exists applied_communication_id uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.ai_suggestions ai
set organization_id = leads.organization_id
from public.leads
where leads.id = ai.lead_id
  and ai.organization_id is null;

alter table public.ai_suggestions
  alter column organization_id set not null;

alter table public.ai_suggestions drop constraint if exists ai_suggestions_status_check;
alter table public.ai_suggestions
  add constraint ai_suggestions_status_check
  check (
    status = any (
      array[
        'generated'::text,
        'reviewed'::text,
        'approved'::text,
        'dismissed'::text,
        'applied'::text
      ]
    )
  );

update public.ai_suggestions
set status = case
  when lower(coalesce(status, '')) = 'pending' then 'generated'
  when lower(coalesce(status, '')) = 'accepted' then 'approved'
  when lower(coalesce(status, '')) = 'rejected' then 'dismissed'
  else status
end;

do $$
begin
  alter table public.ai_suggestions
    add constraint ai_suggestions_organization_id_fkey
    foreign key (organization_id) references public.organizations(id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ai_suggestions
    add constraint ai_suggestions_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.ai_suggestions
    add constraint ai_suggestions_applied_communication_id_fkey
    foreign key (applied_communication_id) references public.communications(id);
exception
  when duplicate_object then null;
end $$;

create index if not exists ai_suggestions_org_status_created_idx
  on public.ai_suggestions (organization_id, status, created_at desc);

create index if not exists ai_suggestions_org_type_created_idx
  on public.ai_suggestions (organization_id, suggestion_type, created_at desc);

create index if not exists ai_suggestions_org_lead_created_idx
  on public.ai_suggestions (organization_id, lead_id, created_at desc);

create or replace function public.set_ai_suggestions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_suggestions_updated_at on public.ai_suggestions;
create trigger trg_ai_suggestions_updated_at
before update on public.ai_suggestions
for each row execute function public.set_ai_suggestions_updated_at();

alter table public.ai_suggestions enable row level security;

drop policy if exists ai_suggestions_select_same_org on public.ai_suggestions;
create policy ai_suggestions_select_same_org on public.ai_suggestions
for select using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.organization_id = ai_suggestions.organization_id
  )
);

drop policy if exists ai_suggestions_insert_same_org on public.ai_suggestions;
create policy ai_suggestions_insert_same_org on public.ai_suggestions
for insert with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.organization_id = ai_suggestions.organization_id
  )
);

drop policy if exists ai_suggestions_update_same_org on public.ai_suggestions;
create policy ai_suggestions_update_same_org on public.ai_suggestions
for update using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.organization_id = ai_suggestions.organization_id
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.is_active = true
      and om.organization_id = ai_suggestions.organization_id
  )
);

comment on table public.ai_suggestions is 'Phase 4 SSOT table for reviewable AI-assisted drafts and operator decisions.';
comment on column public.ai_suggestions.operator_notes is 'Optional operator note captured during review, approval, dismissal, or application.';
comment on column public.ai_suggestions.applied_communication_id is 'Communication draft created from an approved/applied AI suggestion. No auto-send is implied.';
