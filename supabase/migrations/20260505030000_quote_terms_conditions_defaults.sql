-- V17.6.8 quote/order terms defaults
-- Adds editable organization-level terms used by quote PDF footer and order handoff.
alter table if exists public.organizations
  add column if not exists quote_terms_conditions text,
  add column if not exists order_terms_conditions text;

comment on column public.organizations.quote_terms_conditions is 'Default commercial terms printed on quote PDFs and send previews.';
comment on column public.organizations.order_terms_conditions is 'Default order handoff terms used after quote acceptance.';
