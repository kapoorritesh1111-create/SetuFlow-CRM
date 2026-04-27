-- Migration 111: Create quote_pricing_snapshots table
-- APPLY IMMEDIATELY — fixes /quotes APPLICATION ERROR crash
-- Table is referenced in code but was never created in any migration

BEGIN;

CREATE TABLE IF NOT EXISTS public.quote_pricing_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id    uuid NOT NULL,
  pricing_rule_set_id uuid,
  freight_profile_id  uuid,
  fx_base_currency    text NOT NULL DEFAULT 'USD',
  fx_display_currency text,
  fx_rate             numeric,
  fx_provider         text,
  fx_effective_at     timestamptz,
  quote_context       jsonb NOT NULL DEFAULT '{}',
  freight_context     jsonb NOT NULL DEFAULT '{}',
  calculation_payload jsonb NOT NULL DEFAULT '{}',
  source_hash         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_qps_version
    FOREIGN KEY (quote_version_id)
    REFERENCES public.quote_versions(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_pricing_snapshots_quote_version
  ON public.quote_pricing_snapshots (quote_version_id);

ALTER TABLE public.quote_pricing_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qps_org_access ON public.quote_pricing_snapshots;
CREATE POLICY qps_org_access ON public.quote_pricing_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_versions qv
      JOIN public.quotes q ON q.id = qv.quote_id
      WHERE qv.id = quote_pricing_snapshots.quote_version_id
        AND q.organization_id = (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND is_active = true LIMIT 1
        )
    )
  );

COMMIT;
