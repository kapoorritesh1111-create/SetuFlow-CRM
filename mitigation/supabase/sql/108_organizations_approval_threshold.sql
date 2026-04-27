-- =========================================================
-- Migration 108: Add approval_threshold_pct to organizations
-- Required before PR-NS-09 Security/Roles admin page
-- =========================================================

BEGIN;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS approval_threshold_pct numeric
  CHECK (approval_threshold_pct >= 0 AND approval_threshold_pct <= 100)
  DEFAULT 15;

COMMENT ON COLUMN public.organizations.approval_threshold_pct IS
  'Override approval required when quoted price deviates from catalog baseline by this % or more. Default 15%.';

COMMIT;
