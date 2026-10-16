-- Strong database-level idempotency: only one quote per Quick Quote estimate.
-- Apply after checking for existing duplicate request keys.
create unique index if not exists quotes_quick_quote_request_key_unique
  on public.quotes(organization_id,quote_creation_request_key)
  where quote_creation_request_key like 'quick-quote:%';
