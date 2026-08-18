-- S51-GROWTH-052: SMC Growth unified inbound + researched prospect lead manager
-- Extends the existing client_onboarding_requests pipeline so inbound requests and
-- sales-researched prospects share one lifecycle through demo, trial, conversion.

alter table public.client_onboarding_requests
  alter column primary_admin_email drop not null;

alter table public.client_onboarding_requests
  add column if not exists lead_origin text not null default 'inbound',
  add column if not exists contact_title text,
  add column if not exists linkedin_url text,
  add column if not exists employee_size_signal text,
  add column if not exists evidence_urls text[] not null default '{}',
  add column if not exists fit_reasons text,
  add column if not exists pain_signals text,
  add column if not exists outreach_status text not null default 'not_started',
  add column if not exists research_notes text,
  add column if not exists research_last_verified_at timestamptz;

update public.client_onboarding_requests
set lead_origin = case
  when source in ('website','trade_show','referral','internal','internal_demo_seed') then 'inbound'
  else coalesce(nullif(lead_origin,''), 'inbound')
end
where lead_origin is null or lead_origin = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_onboarding_requests_lead_origin_check'
  ) then
    alter table public.client_onboarding_requests
      add constraint client_onboarding_requests_lead_origin_check
      check (lead_origin in ('inbound','researched','imported','referral'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'client_onboarding_requests_outreach_status_check'
  ) then
    alter table public.client_onboarding_requests
      add constraint client_onboarding_requests_outreach_status_check
      check (outreach_status in ('not_started','ready','contacted','replied','demo_requested','demo_scheduled','nurture','do_not_contact'));
  end if;
end $$;

create index if not exists client_onboarding_requests_growth_origin_idx
  on public.client_onboarding_requests (lead_origin, pipeline_stage, created_at desc);

create index if not exists client_onboarding_requests_growth_outreach_idx
  on public.client_onboarding_requests (outreach_status, next_follow_up_at);

comment on column public.client_onboarding_requests.lead_origin is
  'Growth acquisition origin: inbound, researched, imported, or referral.';
comment on column public.client_onboarding_requests.evidence_urls is
  'Public source URLs supporting prospect contact details, fit, and pain signals.';
