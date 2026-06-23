-- Sprint 36 · SMC mobile · S36-MOBILE-366
-- Add @mention support + author user id to existing issue_comments. Additive, idempotent.
-- Applied live via Supabase MCP on 2026-06-23.
alter table public.issue_comments
  add column if not exists author_user_id uuid,
  add column if not exists mentions uuid[] not null default '{}'::uuid[];

create index if not exists issue_comments_issue_id_created_idx
  on public.issue_comments (issue_id, created_at);

create index if not exists issue_comments_mentions_gin_idx
  on public.issue_comments using gin (mentions);
