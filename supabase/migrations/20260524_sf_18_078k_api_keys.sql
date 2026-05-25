-- SF-18-078K: API keys management (internal SETU only)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  key_hash        text NOT NULL UNIQUE,
  key_prefix      text NOT NULL,
  scopes          text[] NOT NULL DEFAULT '{}',
  last_used_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  is_active       boolean NOT NULL DEFAULT true
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admin manage api keys" ON public.api_keys FOR ALL USING (is_org_admin(organization_id));
