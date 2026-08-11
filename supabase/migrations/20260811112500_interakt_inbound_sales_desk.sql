-- Stark Packmate Interakt inbound sales desk.
-- Additive staging-only schema. Lead promotion remains an explicit server action.

alter table public.lead_intake_staging
  add column if not exists person_name text,
  add column if not exists company_name text,
  add column if not exists packaging_type text,
  add column if not exists pouch_type text,
  add column if not exists quantity_text text,
  add column if not exists dimensions_print text,
  add column if not exists delivery_location text,
  add column if not exists buying_timeline text,
  add column if not exists industry text,
  add column if not exists first_inquiry_at timestamptz,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists channel_source text,
  add column if not exists acquisition_type text,
  add column if not exists ad_network text,
  add column if not exists ad_platform text,
  add column if not exists ad_url text,
  add column if not exists meta_campaign_id text,
  add column if not exists meta_adset_id text,
  add column if not exists meta_ad_id text,
  add column if not exists interakt_assignee_name text,
  add column if not exists qualification_score integer,
  add column if not exists qualification_notes text,
  add column if not exists qualified_lead_id uuid references public.leads(id) on delete set null,
  add column if not exists qualified_at timestamptz,
  add column if not exists qualified_by uuid references auth.users(id) on delete set null;

create index if not exists lead_intake_staging_active_idx
  on public.lead_intake_staging (organization_id, source_provider, intake_status, last_inbound_at desc);

create index if not exists lead_intake_staging_qualified_lead_idx
  on public.lead_intake_staging (organization_id, qualified_lead_id)
  where qualified_lead_id is not null;

create table if not exists public.lead_intake_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_id uuid not null references public.lead_intake_staging(id) on delete cascade,
  provider text not null default 'interakt',
  external_message_id text not null,
  event_type text not null default 'message',
  direction text not null check (direction in ('inbound','outbound','system')),
  actor_type text not null default 'customer' check (actor_type in ('customer','automation','agent','system')),
  actor_name text,
  message_type text,
  message_text text,
  message_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  status text not null default 'received',
  callback_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_message_id)
);

create index if not exists lead_intake_messages_intake_time_idx
  on public.lead_intake_messages (organization_id, intake_id, coalesce(received_at, sent_at, created_at));

alter table public.lead_intake_messages enable row level security;

create policy lead_intake_messages_select_same_org
on public.lead_intake_messages for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_messages.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy lead_intake_messages_insert_same_org
on public.lead_intake_messages for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_messages.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy lead_intake_messages_update_same_org
on public.lead_intake_messages for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_messages.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_messages.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select, insert, update on public.lead_intake_messages to authenticated;

create table if not exists public.lead_intake_workflow_answers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_id uuid not null references public.lead_intake_staging(id) on delete cascade,
  provider text not null default 'interakt',
  workflow_id text,
  workflow_run_id text,
  question_id text,
  question_text text not null,
  answer_text text,
  response_type text,
  answered_at timestamptz,
  evidence_key text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, intake_id, evidence_key)
);

create index if not exists lead_intake_workflow_answers_intake_idx
  on public.lead_intake_workflow_answers (organization_id, intake_id, answered_at desc);

alter table public.lead_intake_workflow_answers enable row level security;

create policy lead_intake_workflow_answers_select_same_org
on public.lead_intake_workflow_answers for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_workflow_answers.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy lead_intake_workflow_answers_insert_same_org
on public.lead_intake_workflow_answers for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_workflow_answers.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

create policy lead_intake_workflow_answers_update_same_org
on public.lead_intake_workflow_answers for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_workflow_answers.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_workflow_answers.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select, insert, update on public.lead_intake_workflow_answers to authenticated;

create table if not exists public.lead_intake_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'interakt',
  event_key text not null,
  event_type text,
  signature_valid boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (organization_id, provider, event_key)
);

alter table public.lead_intake_webhook_events enable row level security;

create policy lead_intake_webhook_events_select_same_org
on public.lead_intake_webhook_events for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_webhook_events.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select on public.lead_intake_webhook_events to authenticated;

comment on table public.lead_intake_messages is 'Inbound/outbound conversation history captured from Interakt for pre-lead qualification.';
comment on table public.lead_intake_workflow_answers is 'Deduplicated structured chatbot/workflow answers captured from Interakt.';
comment on table public.lead_intake_webhook_events is 'Raw Interakt webhook audit and idempotency ledger.';
