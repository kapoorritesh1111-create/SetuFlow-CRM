-- Sprint 41 Batch 4 — unified Setu Mail / Calendar notification defaults.
-- Existing notification tables, RLS and push subscriptions remain authoritative.

insert into public.workspace_notification_settings (
  organization_id,
  notif_type,
  in_app,
  push,
  email,
  whatsapp,
  sms,
  is_locked
)
select
  o.id,
  t.notif_type,
  true,
  true,
  false,
  false,
  false,
  false
from public.organizations o
cross join (values
  ('mail_received'),
  ('calendar_reminder')
) as t(notif_type)
on conflict (organization_id, notif_type) do nothing;
