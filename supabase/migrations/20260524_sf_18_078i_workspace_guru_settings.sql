-- SF-18-078I: Per-org Guru config without env var deploys
CREATE TABLE IF NOT EXISTS public.workspace_guru_settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  model                  text NOT NULL DEFAULT 'gpt-4.1-mini',
  live_search_enabled    boolean NOT NULL DEFAULT true,
  writeback_enabled      boolean NOT NULL DEFAULT false,
  require_admin_approval boolean NOT NULL DEFAULT true,
  ai_analytics_enabled   boolean NOT NULL DEFAULT true,
  daily_search_budget    integer NOT NULL DEFAULT 10,
  updated_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_guru_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admin manage guru settings" ON public.workspace_guru_settings FOR ALL USING (is_org_admin(organization_id));
CREATE POLICY "Org members read guru settings" ON public.workspace_guru_settings FOR SELECT USING (is_org_member(organization_id));
INSERT INTO public.workspace_guru_settings (organization_id) SELECT id FROM public.organizations ON CONFLICT DO NOTHING;
