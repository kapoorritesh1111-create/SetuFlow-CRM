-- Sprint 31 / Trade Show Trial full module preview policy
-- Keep approved trial actions active, but show all major module spaces as preview-capable.

update public.organization_trial_capabilities
set preview_capabilities = array[
  'dashboard',
  'analytics',
  'lead_command_center',
  'pipeline',
  'send',
  'documents',
  'catalog',
  'quotes',
  'orders'
]::text[],
updated_at = now()
where trial_mode = 'trade_show_trial';

create or replace function public.normalize_trade_show_trial_capabilities()
returns trigger
language plpgsql
as $$
begin
  if new.trial_mode = 'trade_show_trial' then
    new.active_capabilities := array[
      'capture_type',
      'capture_dictate',
      'capture_scan',
      'vcard_qr',
      'csv_export'
    ]::text[];

    new.preview_capabilities := array[
      'dashboard',
      'analytics',
      'lead_command_center',
      'pipeline',
      'send',
      'documents',
      'catalog',
      'quotes',
      'orders'
    ]::text[];

    new.allow_exports := true;
    new.allow_premium := false;
  end if;

  return new;
end;
$$;
