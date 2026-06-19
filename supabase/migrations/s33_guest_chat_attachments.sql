-- APPLIED LIVE via Supabase MCP on 2026-06-19. Kept here for repo history.
ALTER TABLE public.guest_chat_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.guest_chat_messages ADD COLUMN IF NOT EXISTS attachment_name text;
