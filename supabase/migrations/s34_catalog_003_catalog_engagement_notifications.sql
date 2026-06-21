-- Sprint 34 catalog engagement notification setting.
-- Applied live via Supabase MCP on 2026-06-21.

insert into public.workspace_notification_settings (
  organization_id, notif_type, in_app, push, email, whatsapp, sms, is_locked
)
select o.id, 'catalog_engagement', true, false, false, false, false, false
from public.organizations o
on conflict (organization_id, notif_type) do nothing;
