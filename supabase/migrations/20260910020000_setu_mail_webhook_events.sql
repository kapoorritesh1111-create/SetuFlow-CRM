create table if not exists public.mail_webhook_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text not null unique,
  event_type text not null,
  provider_message_id text,
  event_created_at timestamptz,
  processed_at timestamptz,
  status text not null default 'received',
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mail_webhook_events_provider_message_idx
  on public.mail_webhook_events(provider_message_id);

create index if not exists mail_webhook_events_event_type_idx
  on public.mail_webhook_events(event_type);

alter table public.mail_webhook_events enable row level security;

comment on table public.mail_webhook_events is
  'Idempotent audit log for Resend webhook deliveries using svix-id.';
