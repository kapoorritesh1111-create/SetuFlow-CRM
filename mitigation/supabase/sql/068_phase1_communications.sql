-- Phase 1: communications table
-- Purpose:
--   Persist structured communication history for introductions, follow-ups,
--   quote outreach, and AI-assisted drafts with human review.

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  related_entity text not null default 'lead' check (related_entity = any (array['lead'::text, 'quote'::text, 'rfq'::text, 'trade_event_entry'::text, 'other'::text])),
  related_id uuid,
  communication_type text not null default 'follow_up' check (communication_type = any (array['introduction'::text, 'follow_up'::text, 'quote_message'::text, 'compliance_request'::text, 'system_note'::text, 'other'::text])),
  direction text not null default 'outbound' check (direction = any (array['inbound'::text, 'outbound'::text, 'internal'::text])),
  channel text not null default 'email' check (channel = any (array['email'::text, 'phone'::text, 'whatsapp'::text, 'linkedin'::text, 'trade_show'::text, 'meeting'::text, 'system'::text, 'other'::text])),
  subject text,
  body text,
  summary text,
  draft_source text not null default 'manual' check (draft_source = any (array['manual'::text, 'ai'::text, 'imported'::text, 'system'::text])),
  status text not null default 'draft' check (status = any (array['draft'::text, 'approved'::text, 'sent'::text, 'received'::text, 'failed'::text, 'cancelled'::text])),
  sent_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  provider_message_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists communications_organization_idx on public.communications (organization_id, created_at desc);
create index if not exists communications_lead_idx on public.communications (lead_id, created_at desc);
create index if not exists communications_quote_idx on public.communications (quote_id, created_at desc);
create index if not exists communications_status_idx on public.communications (status, scheduled_at);

create or replace function public.set_communications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_communications_updated_at on public.communications;
create trigger trg_communications_updated_at
before update on public.communications
for each row execute function public.set_communications_updated_at();

alter table public.communications enable row level security;

create policy communications_select_same_org on public.communications
for select using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = communications.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy communications_insert_same_org on public.communications
for insert with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = communications.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy communications_update_same_org on public.communications
for update using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = communications.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
) with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = communications.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

comment on table public.communications is 'Phase 1 SSOT table for intro, follow-up, quote, and compliance communication history.';
comment on column public.communications.draft_source is 'Tracks whether the content originated from manual entry, AI draft assistance, an import, or a system-generated record.';
