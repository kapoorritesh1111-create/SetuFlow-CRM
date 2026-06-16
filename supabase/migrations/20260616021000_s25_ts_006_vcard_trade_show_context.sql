-- S25-TS-006: trade-show context on public vCard settings

alter table public.my_card_settings
  add column if not exists trade_show_name text,
  add column if not exists booth_number text;

comment on column public.my_card_settings.trade_show_name is 'Trade show name shown on public vCard and QR card context for trial signups.';
comment on column public.my_card_settings.booth_number is 'Optional booth number shown on public vCard and QR card context for trial signups.';
