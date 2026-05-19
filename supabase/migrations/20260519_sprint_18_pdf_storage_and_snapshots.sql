-- Sprint 18: PDF storage path, private PDF bucket, and analytics snapshot safety
-- Applied first through Supabase MCP on 2026-05-19; kept here for source control history.

alter table public.order_documents
  add column if not exists pdf_storage_path text;

comment on column public.order_documents.pdf_storage_path is
  'Sprint 18: Supabase Storage object path for server-rendered order document PDFs. Browser print remains fallback.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-documents', 'order-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();
