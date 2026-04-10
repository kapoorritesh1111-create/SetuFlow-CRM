create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  actor_user_id uuid null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
