-- S31-LEADS-014: capture selected guided trial template at SMC lead intake.

alter table public.client_onboarding_requests
  add column if not exists trial_template_key text not null default 'export_foods_basic';

alter table public.client_onboarding_requests
  drop constraint if exists client_onboarding_requests_trial_template_key_check;

alter table public.client_onboarding_requests
  add constraint client_onboarding_requests_trial_template_key_check
  check (trial_template_key in ('export_foods_basic', 'ingredient_trader', 'distributor_importer', 'packaging_converter'));

comment on column public.client_onboarding_requests.trial_template_key is 'Guided trial setup template requested at internal lead intake. Blank UI selection resolves to export_foods_basic common template.';
