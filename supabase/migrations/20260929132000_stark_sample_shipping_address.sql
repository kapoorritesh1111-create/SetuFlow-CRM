alter table public.leads
  add column if not exists sample_shipping_address_line1 text,
  add column if not exists sample_shipping_address_line2 text,
  add column if not exists sample_shipping_city text,
  add column if not exists sample_shipping_state text,
  add column if not exists sample_shipping_postal_code text,
  add column if not exists sample_shipping_country text,
  add column if not exists sample_shipping_contact_name text,
  add column if not exists sample_shipping_phone text,
  add column if not exists sample_shipping_enabled boolean not null default false;
