create table if not exists public.whatsapp_attachment_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_id uuid null references public.lead_intake_staging(id) on delete cascade,
  lead_id uuid null references public.leads(id) on delete cascade,
  storage_bucket text not null default 'organization-assets',
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  file_size bigint null,
  token text not null unique,
  status text not null default 'staged' check (status in ('staged','sent','expired')),
  provider_message_id text null,
  created_by uuid null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_attachment_context_check check (intake_id is not null or lead_id is not null)
);

create index if not exists whatsapp_attachment_shares_org_idx on public.whatsapp_attachment_shares (organization_id, created_at desc);
create index if not exists whatsapp_attachment_shares_intake_idx on public.whatsapp_attachment_shares (intake_id) where intake_id is not null;
create index if not exists whatsapp_attachment_shares_lead_idx on public.whatsapp_attachment_shares (lead_id) where lead_id is not null;
create index if not exists whatsapp_attachment_shares_expiry_idx on public.whatsapp_attachment_shares (expires_at);

alter table public.whatsapp_attachment_shares enable row level security;

comment on table public.whatsapp_attachment_shares is 'Private storage-backed attachment share records used by Stark Packmate WhatsApp engagement. Public access is only through opaque expiring tokens resolved server-side.';
