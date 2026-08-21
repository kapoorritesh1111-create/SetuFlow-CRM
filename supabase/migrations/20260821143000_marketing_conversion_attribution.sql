create table if not exists public.marketing_conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  channel text not null default 'unknown',
  landing_page text,
  conversion_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  visitor_email text,
  company_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint marketing_conversion_events_channel_check check (
    channel in ('direct', 'organic_search', 'paid_search', 'social', 'referral', 'campaign', 'email', 'unknown')
  )
);

create index if not exists marketing_conversion_events_created_at_idx
  on public.marketing_conversion_events(created_at desc);
create index if not exists marketing_conversion_events_event_channel_idx
  on public.marketing_conversion_events(event_name, channel, created_at desc);

alter table public.marketing_conversion_events enable row level security;

comment on table public.marketing_conversion_events is
  'Server-side first-touch marketing attribution for public SETU Flow conversion events such as demo requests.';
comment on column public.marketing_conversion_events.channel is
  'Normalized attribution channel derived server-side from UTM parameters and the first external referrer.';
