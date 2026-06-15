-- Sprint 25 / S25-TS-003: Trade-show trial workspace module mode
-- Keeps Trade Show Trial capability rows aligned with the server/UI source of truth.

create or replace function public.normalize_trade_show_trial_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_mode = 'trade_show_trial' then
    new.active_capabilities := array[
      'capture_type',
      'capture_dictate',
      'capture_scan',
      'vcard_qr',
      'csv_export'
    ];
    new.preview_capabilities := array[
      'dashboard',
      'analytics',
      'lead_command_center',
      'quotes',
      'orders'
    ];
    new.allow_exports := true;
    new.allow_premium := false;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists organization_trial_capabilities_normalize_trade_show_trial
  on public.organization_trial_capabilities;

create trigger organization_trial_capabilities_normalize_trade_show_trial
before insert or update on public.organization_trial_capabilities
for each row
execute function public.normalize_trade_show_trial_capabilities();

update public.organization_trial_capabilities
set active_capabilities = array[
      'capture_type',
      'capture_dictate',
      'capture_scan',
      'vcard_qr',
      'csv_export'
    ],
    preview_capabilities = array[
      'dashboard',
      'analytics',
      'lead_command_center',
      'quotes',
      'orders'
    ],
    allow_exports = true,
    allow_premium = false,
    updated_at = now()
where trial_mode = 'trade_show_trial';

update public.client_entitlement_profiles
set allow_exports = true,
    guided_mode_enabled = true,
    allow_invites = false,
    allow_settings_edit = false,
    allow_dispatch = false,
    updated_at = now()
where billing_status = 'trial'
  and onboarding_stage = 'guided_trial'
  and exists (
    select 1
    from public.organization_trial_capabilities otc
    where otc.organization_id = client_entitlement_profiles.organization_id
      and otc.trial_mode = 'trade_show_trial'
  );

insert into public.org_module_grants (organization_id, module_key, enabled)
select otc.organization_id, grant_row.module_key, grant_row.enabled
from public.organization_trial_capabilities otc
cross join (values
  ('trade_show', true),
  ('vcard', true),
  ('full_crm', false),
  ('orders_compliance', false),
  ('setu_guru', false),
  ('analytics', false)
) as grant_row(module_key, enabled)
where otc.trial_mode = 'trade_show_trial'
on conflict (organization_id, module_key) do update set
  enabled = excluded.enabled,
  updated_at = now();
