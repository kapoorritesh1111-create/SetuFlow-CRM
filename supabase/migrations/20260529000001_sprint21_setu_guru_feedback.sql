-- SF-21-006: Durable Setu Guru feedback table
CREATE TABLE IF NOT EXISTS public.setu_guru_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label           text NOT NULL CHECK (label IN ('helpful', 'missing')),
  last_message    text NOT NULL DEFAULT '',
  pathname        text NOT NULL DEFAULT '',
  route_title     text NOT NULL DEFAULT '',
  help_file       text NOT NULL DEFAULT '',
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.setu_guru_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setu_guru_feedback_insert" ON public.setu_guru_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "setu_guru_feedback_select" ON public.setu_guru_feedback FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_setu_guru_feedback_org ON public.setu_guru_feedback(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setu_guru_feedback_label ON public.setu_guru_feedback(organization_id, label);
COMMENT ON TABLE public.setu_guru_feedback IS 'SF-21-006: Durable per-org Setu Guru feedback.';
