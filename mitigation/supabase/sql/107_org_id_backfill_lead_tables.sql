-- =========================================================
-- Migration 107: Add organization_id to lead_markets,
-- lead_product_interests, and contract_line_items
-- Fixes: /ai-suggestions "Some live data could not be loaded" banner
-- Safe to run multiple times (idempotent guards)
-- =========================================================

BEGIN;

-- ─── 1. lead_markets ─────────────────────────────────────
ALTER TABLE public.lead_markets
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id);

UPDATE public.lead_markets lm
SET organization_id = l.organization_id
FROM public.leads l
WHERE lm.lead_id = l.id AND lm.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_markets_organization_id
  ON public.lead_markets (organization_id);

DROP POLICY IF EXISTS lead_markets_org_isolation ON public.lead_markets;
CREATE POLICY lead_markets_org_isolation ON public.lead_markets
  FOR ALL TO authenticated
  USING (organization_id = (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() LIMIT 1
  ));

ALTER TABLE public.lead_markets ENABLE ROW LEVEL SECURITY;

-- ─── 2. lead_product_interests ───────────────────────────
ALTER TABLE public.lead_product_interests
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id);

UPDATE public.lead_product_interests lpi
SET organization_id = l.organization_id
FROM public.leads l
WHERE lpi.lead_id = l.id AND lpi.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_product_interests_organization_id
  ON public.lead_product_interests (organization_id);

DROP POLICY IF EXISTS lead_product_interests_org_isolation ON public.lead_product_interests;
CREATE POLICY lead_product_interests_org_isolation ON public.lead_product_interests
  FOR ALL TO authenticated
  USING (organization_id = (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() LIMIT 1
  ));

ALTER TABLE public.lead_product_interests ENABLE ROW LEVEL SECURITY;

-- ─── 3. contract_line_items ──────────────────────────────
ALTER TABLE public.contract_line_items
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id);

UPDATE public.contract_line_items cli
SET organization_id = c.organization_id
FROM public.contracts c
WHERE cli.contract_id = c.id AND cli.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_line_items_organization_id
  ON public.contract_line_items (organization_id);

DROP POLICY IF EXISTS contract_line_items_org_isolation ON public.contract_line_items;
CREATE POLICY contract_line_items_org_isolation ON public.contract_line_items
  FOR ALL TO authenticated
  USING (organization_id = (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() LIMIT 1
  ));

ALTER TABLE public.contract_line_items ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify: all should return 0 after migration
-- SELECT COUNT(*) FROM lead_markets WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM lead_product_interests WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM contract_line_items WHERE organization_id IS NULL;
