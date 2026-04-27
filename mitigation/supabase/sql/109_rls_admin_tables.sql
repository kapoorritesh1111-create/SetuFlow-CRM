-- =========================================================
-- Migration 109 v3: RLS hardening for admin-managed tables
-- markets, pipeline_stages, pipelines
--
-- FIXES vs v2:
--   • pipeline_stages has NO organization_id column.
--     It belongs to pipelines via pipeline_id.
--     RLS must join through pipelines to resolve org.
--   • Removed idx_pipeline_stages_org_order (no org column).
--     Added idx_pipeline_stages_pipeline_order instead.
-- =========================================================

BEGIN;

-- ─── 1. markets ──────────────────────────────────────────
-- markets HAS organization_id — no join needed.

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS markets_org_read    ON public.markets;
DROP POLICY IF EXISTS markets_admin_write ON public.markets;

CREATE POLICY markets_org_read ON public.markets
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

CREATE POLICY markets_admin_write ON public.markets
  FOR ALL TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.user_roles ur ON ur.organization_member_id = om.id
      JOIN public.roles r       ON r.id = ur.role_id
      WHERE om.user_id   = auth.uid()
        AND om.is_active = true
        AND r.name IN ('owner', 'admin')
    )
  );


-- ─── 2. pipelines ────────────────────────────────────────
-- pipelines HAS organization_id — no join needed.

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipelines_org_read    ON public.pipelines;
DROP POLICY IF EXISTS pipelines_admin_write ON public.pipelines;

CREATE POLICY pipelines_org_read ON public.pipelines
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  );

CREATE POLICY pipelines_admin_write ON public.pipelines
  FOR ALL TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.user_roles ur ON ur.organization_member_id = om.id
      JOIN public.roles r       ON r.id = ur.role_id
      WHERE om.user_id   = auth.uid()
        AND om.is_active = true
        AND r.name IN ('owner', 'admin')
    )
  );


-- ─── 3. pipeline_stages ──────────────────────────────────
-- pipeline_stages has NO organization_id.
-- It links to pipelines via pipeline_id.
-- Org isolation must join through pipelines.

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_stages_org_read    ON public.pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_admin_write ON public.pipeline_stages;

CREATE POLICY pipeline_stages_org_read ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pipelines p
      WHERE p.id = pipeline_stages.pipeline_id
        AND p.organization_id = (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND is_active = true
          LIMIT 1
        )
    )
  );

CREATE POLICY pipeline_stages_admin_write ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pipelines p
      WHERE p.id = pipeline_stages.pipeline_id
        AND p.organization_id = (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND is_active = true
          LIMIT 1
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.user_roles ur ON ur.organization_member_id = om.id
      JOIN public.roles r       ON r.id = ur.role_id
      WHERE om.user_id   = auth.uid()
        AND om.is_active = true
        AND r.name IN ('owner', 'admin')
    )
  );

-- Correct index: pipeline_stages orders within a pipeline, not an org
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_order
  ON public.pipeline_stages (pipeline_id, sort_order);

COMMIT;

-- ─── Verify (run separately after migration) ─────────────
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('markets', 'pipeline_stages', 'pipelines')
--   AND schemaname = 'public';
-- All three rows should show rowsecurity = true.
