-- S34-CATALOG-002: Align catalog share constraints with Sprint 34 code paths.
-- Applied live on 2026-06-21 via Supabase MCP before this repo record was added.
-- Purpose:
-- 1) Allow quote drafts created from catalog share selections to persist source_type='catalog_share'.
-- 2) Allow catalog shares to be archived consistently with the Sprint 34 handoff and TS contract.

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_source_type_check;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_source_type_check
  CHECK (source_type = ANY (ARRAY['manual'::text, 'rfq'::text, 'lead'::text, 'imported'::text, 'api'::text, 'catalog_share'::text]));

ALTER TABLE public.catalog_shares
  DROP CONSTRAINT IF EXISTS catalog_shares_status_check;

ALTER TABLE public.catalog_shares
  ADD CONSTRAINT catalog_shares_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'revoked'::text, 'archived'::text]));
