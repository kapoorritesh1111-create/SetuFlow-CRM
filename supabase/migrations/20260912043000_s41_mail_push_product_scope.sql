-- Additive: existing CRM/SMC subscriptions and their permissions stay unchanged.
alter table public.push_subscriptions
  add column if not exists app_scope text not null default 'crm';
alter table public.push_subscriptions
  add constraint push_subscriptions_app_scope_check check (app_scope in ('crm', 'setu-mail'));
create index if not exists push_subscriptions_product_recipient_idx
  on public.push_subscriptions (organization_id, user_id, app_scope);
comment on column public.push_subscriptions.app_scope is
  'Product subscription boundary. setu-mail accepts only mail_received/calendar_reminder for its organization.';
