-- Sprint 25 / S25-TS-008: upgrade preview intent tracking for Trade Show Trial.

create table if not exists public.trial_intent_events (
  id uuid primary key default gen_random_uuid(),
  trial_org_id uuid not null references public.organizations(id),
  internal_lead_id uuid not null references public.leads(id),
  actor_user_id uuid references public.profiles(id),
  action text not null check (action in ('preview_viewed', 'upgrade_requested')),
  module text not null check (module in ('dashboard', 'analytics', 'lead_command_center', 'quotes', 'orders')),
  occurred_at timestamptz not null default now(),
  dedupe_bucket timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists trial_intent_events_dedupe_idx
  on public.trial_intent_events (trial_org_id, action, module, dedupe_bucket);

create index if not exists trial_intent_events_trial_org_occurred_idx
  on public.trial_intent_events (trial_org_id, occurred_at desc);

create index if not exists trial_intent_events_internal_lead_occurred_idx
  on public.trial_intent_events (internal_lead_id, occurred_at desc);

alter table public.trial_intent_events enable row level security;

create policy "trial_intent_events_members_read"
  on public.trial_intent_events
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = trial_intent_events.trial_org_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );
