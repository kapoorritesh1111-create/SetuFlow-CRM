-- Sprint 36 · SMC mobile · S36-MOBILE-371
-- Add device tracking to existing push_subscriptions for stale-subscription cleanup. Additive, idempotent.
-- Applied live via Supabase MCP on 2026-06-23.
alter table public.push_subscriptions
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists device_label text;
