-- APPLIED LIVE via Supabase MCP on 2026-06-19. Kept here for repo history.
CREATE TABLE IF NOT EXISTS public.guest_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  label text, guest_name text, guest_email text,
  qa_token text, created_by text,
  expires_at timestamptz, revoked_at timestamptz,
  use_count integer NOT NULL DEFAULT 0, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guest_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  guest_link_id uuid NOT NULL REFERENCES public.guest_links(id) ON DELETE CASCADE,
  sender_kind text NOT NULL CHECK (sender_kind IN ('guest','team')),
  sender_name text, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_chat_messages_link_idx ON public.guest_chat_messages (guest_link_id, created_at);
ALTER TABLE public.guest_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_links_member_select ON public.guest_links;
CREATE POLICY guest_links_member_select ON public.guest_links FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = guest_links.organization_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS guest_chat_member_select ON public.guest_chat_messages;
CREATE POLICY guest_chat_member_select ON public.guest_chat_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = guest_chat_messages.organization_id AND m.user_id = auth.uid()));
