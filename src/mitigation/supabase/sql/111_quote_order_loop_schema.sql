-- 111_quote_order_loop_schema.sql
-- PR-SCHEMA-FIX-QUOTE-ORDER-LOOP
-- Additive schema alignment for approval-send and sent quote order ingestion.
-- Run in Supabase before regenerating src/types/database.generated.ts.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_quotes_organization_status
  ON public.quotes (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_sent_at
  ON public.quotes (sent_at);

CREATE INDEX IF NOT EXISTS idx_contracts_quote_id
  ON public.contracts (quote_id);

CREATE INDEX IF NOT EXISTS idx_contracts_organization_status
  ON public.contracts (organization_id, status);
