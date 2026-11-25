alter table public.my_card_settings
  add column if not exists display_name text,
  add column if not exists professional_designation text,
  add column if not exists business_email text;
