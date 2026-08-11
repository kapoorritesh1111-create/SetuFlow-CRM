-- Interakt company/brand intelligence evidence for the inbound sales desk.
-- Additive only. Image-derived values remain suggestions until a salesperson confirms them.

alter table public.lead_intake_staging
  add column if not exists brand_name text,
  add column if not exists proposed_company_name text,
  add column if not exists proposed_brand_name text,
  add column if not exists company_evidence jsonb not null default '{}'::jsonb,
  add column if not exists company_intelligence_updated_at timestamptz;

alter table public.lead_intake_messages
  add column if not exists media_url text,
  add column if not exists intelligence jsonb not null default '{}'::jsonb;

comment on column public.lead_intake_staging.proposed_company_name is
  'Setu Guru company suggestion from non-authoritative evidence such as an image. Requires human confirmation.';
comment on column public.lead_intake_staging.proposed_brand_name is
  'Setu Guru brand suggestion from non-authoritative evidence such as an image. Requires human confirmation.';
comment on column public.lead_intake_staging.company_evidence is
  'Evidence trail for company/brand extraction from Interakt workflow answers, customer chat text, or images.';
comment on column public.lead_intake_messages.media_url is
  'Public Interakt media URL supplied by the incoming-message webhook.';
comment on column public.lead_intake_messages.intelligence is
  'Setu Guru extraction result for this message; advisory only.';
