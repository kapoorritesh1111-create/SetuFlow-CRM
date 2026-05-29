-- SF-21-010: Setu Guru observability telemetry table
CREATE TABLE IF NOT EXISTS public.setu_guru_telemetry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route               text NOT NULL DEFAULT '',
  question_length     integer NOT NULL DEFAULT 0,
  mode                text NOT NULL DEFAULT '',
  confidence          text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')) DEFAULT 'low',
  blocker_count       integer NOT NULL DEFAULT 0,
  answer_source_type  text NOT NULL DEFAULT '',
  latency_ms          integer NOT NULL DEFAULT 0,
  blocked             boolean NOT NULL DEFAULT false,
  blocked_reason      text NOT NULL DEFAULT '',
  error               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.setu_guru_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setu_guru_telemetry_insert" ON public.setu_guru_telemetry FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "setu_guru_telemetry_select" ON public.setu_guru_telemetry FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_setu_guru_telemetry_org ON public.setu_guru_telemetry(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setu_guru_telemetry_confidence ON public.setu_guru_telemetry(organization_id, confidence);
CREATE INDEX IF NOT EXISTS idx_setu_guru_telemetry_blocked ON public.setu_guru_telemetry(organization_id, blocked);
COMMENT ON TABLE public.setu_guru_telemetry IS 'SF-21-010: PII-safe operational telemetry for Setu Guru. Never stores question content.';
