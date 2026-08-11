alter table public.lead_intake_staging
  add column if not exists guru_evaluation_status text not null default 'pending',
  add column if not exists guru_evaluated_at timestamptz,
  add column if not exists guru_last_evidence_at timestamptz,
  add column if not exists historical_backfill_status text not null default 'not_requested',
  add column if not exists historical_backfill_from timestamptz,
  add column if not exists historical_backfill_to timestamptz,
  add column if not exists historical_backfill_updated_at timestamptz,
  add column if not exists needs_reply boolean not null default false,
  add column if not exists last_outbound_at timestamptz;

update public.lead_intake_staging
set
  guru_evaluation_status = case
    when first_inquiry_at is not null or last_inbound_at is not null then 'new_evidence'
    else 'partial_history'
  end,
  guru_last_evidence_at = coalesce(last_inbound_at, first_inquiry_at, company_intelligence_updated_at),
  historical_backfill_status = case
    when first_inquiry_at >= now() - interval '30 days' then 'partial'
    else 'pending'
  end,
  historical_backfill_from = now() - interval '30 days',
  historical_backfill_to = now(),
  historical_backfill_updated_at = now()
where source_provider = 'interakt';

create table if not exists public.lead_intake_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_id uuid not null references public.lead_intake_staging(id) on delete cascade,
  provider text not null default 'interakt',
  external_conversation_id text,
  source_kind text not null default 'live',
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'new',
  guru_evaluation_status text not null default 'pending',
  guru_evaluated_at timestamptz,
  guru_last_evidence_at timestamptz,
  guru_score integer,
  guru_band text,
  guru_missing_fields jsonb not null default '[]'::jsonb,
  guru_evaluation jsonb not null default '{}'::jsonb,
  qualified_lead_id uuid references public.leads(id) on delete set null,
  qualified_at timestamptz,
  qualified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lead_intake_inquiries_external_conversation_uidx
  on public.lead_intake_inquiries (organization_id, provider, external_conversation_id)
  where external_conversation_id is not null;

create unique index if not exists lead_intake_inquiries_contact_started_uidx
  on public.lead_intake_inquiries (organization_id, intake_id, started_at);

create index if not exists lead_intake_inquiries_queue_idx
  on public.lead_intake_inquiries (organization_id, status, last_activity_at desc);

create index if not exists lead_intake_inquiries_guru_idx
  on public.lead_intake_inquiries (organization_id, guru_evaluation_status, last_activity_at desc);

alter table public.lead_intake_inquiries enable row level security;

drop policy if exists lead_intake_inquiries_select_same_org on public.lead_intake_inquiries;
create policy lead_intake_inquiries_select_same_org
on public.lead_intake_inquiries for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_inquiries.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_inquiries_insert_same_org on public.lead_intake_inquiries;
create policy lead_intake_inquiries_insert_same_org
on public.lead_intake_inquiries for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_inquiries.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_inquiries_update_same_org on public.lead_intake_inquiries;
create policy lead_intake_inquiries_update_same_org
on public.lead_intake_inquiries for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_inquiries.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_inquiries.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select, insert, update on public.lead_intake_inquiries to authenticated;

alter table public.lead_intake_messages
  add column if not exists inquiry_id uuid references public.lead_intake_inquiries(id) on delete set null;

alter table public.lead_intake_workflow_answers
  add column if not exists inquiry_id uuid references public.lead_intake_inquiries(id) on delete set null;

create index if not exists lead_intake_messages_inquiry_idx
  on public.lead_intake_messages (organization_id, inquiry_id, coalesce(received_at, sent_at, created_at));

create index if not exists lead_intake_workflow_answers_inquiry_idx
  on public.lead_intake_workflow_answers (organization_id, inquiry_id, answered_at desc);

insert into public.lead_intake_inquiries (
  organization_id,
  intake_id,
  provider,
  source_kind,
  started_at,
  last_activity_at,
  status,
  guru_evaluation_status,
  guru_last_evidence_at,
  guru_score,
  created_at,
  updated_at
)
select
  s.organization_id,
  s.id,
  s.source_provider,
  'live',
  coalesce(s.first_inquiry_at, s.last_inbound_at),
  coalesce(s.last_inbound_at, s.first_inquiry_at),
  coalesce(nullif(s.intake_status, 'staged'), 'new'),
  case when s.first_inquiry_at is not null then 'new_evidence' else 'partial_history' end,
  coalesce(s.last_inbound_at, s.first_inquiry_at, s.company_intelligence_updated_at),
  s.qualification_score,
  now(),
  now()
from public.lead_intake_staging s
where s.source_provider = 'interakt'
  and coalesce(s.first_inquiry_at, s.last_inbound_at) is not null
  and coalesce(s.first_inquiry_at, s.last_inbound_at) >= now() - interval '30 days'
on conflict (organization_id, intake_id, started_at) do nothing;

update public.lead_intake_messages m
set inquiry_id = i.id
from public.lead_intake_inquiries i
where m.inquiry_id is null
  and i.organization_id = m.organization_id
  and i.intake_id = m.intake_id
  and i.provider = m.provider
  and coalesce(m.received_at, m.sent_at, m.created_at) >= i.started_at
  and (i.ended_at is null or coalesce(m.received_at, m.sent_at, m.created_at) <= i.ended_at);

update public.lead_intake_workflow_answers a
set inquiry_id = i.id
from public.lead_intake_inquiries i
where a.inquiry_id is null
  and i.organization_id = a.organization_id
  and i.intake_id = a.intake_id
  and i.provider = a.provider
  and coalesce(a.answered_at, a.created_at) >= i.started_at
  and (i.ended_at is null or coalesce(a.answered_at, a.created_at) <= i.ended_at);

create table if not exists public.lead_intake_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'interakt',
  import_kind text not null,
  window_from timestamptz not null,
  window_to timestamptz not null,
  status text not null default 'pending',
  source_file_name text,
  total_rows integer not null default 0,
  matched_rows integer not null default 0,
  inserted_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_rows integer not null default 0,
  error_summary jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_intake_backfill_runs_org_idx
  on public.lead_intake_backfill_runs (organization_id, created_at desc);

alter table public.lead_intake_backfill_runs enable row level security;

drop policy if exists lead_intake_backfill_runs_select_same_org on public.lead_intake_backfill_runs;
create policy lead_intake_backfill_runs_select_same_org
on public.lead_intake_backfill_runs for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_backfill_runs.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_backfill_runs_insert_same_org on public.lead_intake_backfill_runs;
create policy lead_intake_backfill_runs_insert_same_org
on public.lead_intake_backfill_runs for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_backfill_runs.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_backfill_runs_update_same_org on public.lead_intake_backfill_runs;
create policy lead_intake_backfill_runs_update_same_org
on public.lead_intake_backfill_runs for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_backfill_runs.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = lead_intake_backfill_runs.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select, insert, update on public.lead_intake_backfill_runs to authenticated;
