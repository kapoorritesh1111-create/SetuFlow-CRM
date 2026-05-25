-- SF-18-078H: Rate limit overrides with audit trail
CREATE TABLE IF NOT EXISTS public.rate_limit_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_prefix      text NOT NULL,
  limit_value     integer NOT NULL,
  window_ms       integer NOT NULL,
  overridden_by   uuid REFERENCES auth.users(id),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key_prefix)
);
CREATE TABLE IF NOT EXISTS public.rate_limit_override_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  key_prefix      text NOT NULL,
  old_value       integer,
  new_value       integer NOT NULL,
  changed_by      uuid REFERENCES auth.users(id),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_override_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admin manage rate limit overrides" ON public.rate_limit_overrides FOR ALL USING (is_org_admin(organization_id));
CREATE POLICY "Org admin view rate limit audit" ON public.rate_limit_override_audit FOR SELECT USING (is_org_admin(organization_id));
