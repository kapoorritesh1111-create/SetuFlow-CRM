-- =========================================================
-- Migration 110: Add capture_defaults to trade_events
-- Apply before PR-NS-10 starts
-- Safe: IF NOT EXISTS guard
-- =========================================================

BEGIN;

ALTER TABLE public.trade_events
  ADD COLUMN IF NOT EXISTS capture_defaults jsonb
  NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.trade_events.capture_defaults IS
  'JSON config for trade show lead capture defaults.
   Schema: { "default_product_label": "Mango Powder", "default_lead_type": "buyer", "default_follow_up_days": 3 }
   All keys optional. Used by Lead Quick Capture drawer to pre-fill event-specific defaults.';

COMMIT;

-- Verify:
-- SELECT id, name, capture_defaults FROM public.trade_events LIMIT 5;
-- All rows should show capture_defaults = {}
