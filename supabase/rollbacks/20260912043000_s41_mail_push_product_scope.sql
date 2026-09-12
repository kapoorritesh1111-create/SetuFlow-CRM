-- Roll application code back first. Remove SETU Mail endpoints so the legacy
-- unfiltered sender cannot deliver unrelated CRM alerts to these devices.
delete from public.push_subscriptions where app_scope = 'setu-mail';
drop index if exists public.push_subscriptions_product_recipient_idx;
alter table public.push_subscriptions drop column if exists app_scope;
