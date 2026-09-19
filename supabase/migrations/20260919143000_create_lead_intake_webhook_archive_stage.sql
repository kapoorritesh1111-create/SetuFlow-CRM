-- C2: Lead intake retention archive stage
-- Non-destructive: creates a private archive copy for processed webhook events.
-- Source rows in public.lead_intake_webhook_events are intentionally retained.

create schema if not exists archive;

revoke all on schema archive from public, anon, authenticated;

create table if not exists archive.lead_intake_webhook_events (
  id uuid primary key,
  organization_id uuid not null,
  provider text not null,
  event_key text,
  event_type text,
  signature_valid boolean,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null,
  archived_at timestamptz not null default now(),
  archive_reason text not null default 'processed_30d'
);

create index if not exists lead_intake_webhook_events_archive_created_at_idx
  on archive.lead_intake_webhook_events (created_at);

create index if not exists lead_intake_webhook_events_archive_org_created_idx
  on archive.lead_intake_webhook_events (organization_id, created_at desc);

comment on table archive.lead_intake_webhook_events is
  'Cold-copy archive for processed lead intake webhook events. Source rows remain in public until a separately approved purge step.';

insert into archive.lead_intake_webhook_events (
  id, organization_id, provider, event_key, event_type, signature_valid,
  payload, processed_at, processing_error, created_at, archive_reason
)
select
  id, organization_id, provider, event_key, event_type, signature_valid,
  payload, processed_at, processing_error, created_at, 'processed_30d'
from public.lead_intake_webhook_events
where processed_at is not null
  and processing_error is null
  and created_at < now() - interval '30 days'
on conflict (id) do nothing;
