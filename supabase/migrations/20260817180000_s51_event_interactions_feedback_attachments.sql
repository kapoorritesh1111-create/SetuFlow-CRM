-- S51 Trade Events: recommendation feedback + private event-entry attachments.

create table if not exists public.trade_event_recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_event_id uuid not null references public.trade_event_catalog(id) on delete cascade,
  feedback text not null check (feedback in ('saved','not_relevant','attending')),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, catalog_event_id)
);

create table if not exists public.trade_event_entry_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trade_event_entry_id uuid not null references public.trade_event_entries(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, file_path)
);

create index if not exists trade_event_feedback_org_idx on public.trade_event_recommendation_feedback(organization_id, feedback);
create index if not exists trade_event_entry_attachments_entry_idx on public.trade_event_entry_attachments(organization_id, trade_event_entry_id);

alter table public.trade_event_recommendation_feedback enable row level security;
alter table public.trade_event_entry_attachments enable row level security;

create policy trade_event_feedback_select_same_org on public.trade_event_recommendation_feedback for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = trade_event_recommendation_feedback.organization_id and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_feedback_insert_same_org on public.trade_event_recommendation_feedback for insert to authenticated with check (exists (select 1 from public.organization_members om where om.organization_id = trade_event_recommendation_feedback.organization_id and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_feedback_update_same_org on public.trade_event_recommendation_feedback for update to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = trade_event_recommendation_feedback.organization_id and om.user_id = auth.uid() and om.is_active = true)) with check (exists (select 1 from public.organization_members om where om.organization_id = trade_event_recommendation_feedback.organization_id and om.user_id = auth.uid() and om.is_active = true));

create policy trade_event_attachments_select_same_org on public.trade_event_entry_attachments for select to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = trade_event_entry_attachments.organization_id and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_attachments_insert_same_org on public.trade_event_entry_attachments for insert to authenticated with check (exists (select 1 from public.organization_members om where om.organization_id = trade_event_entry_attachments.organization_id and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_attachments_delete_same_org on public.trade_event_entry_attachments for delete to authenticated using (exists (select 1 from public.organization_members om where om.organization_id = trade_event_entry_attachments.organization_id and om.user_id = auth.uid() and om.is_active = true));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-event-attachments', 'trade-event-attachments', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy trade_event_storage_select_same_org on storage.objects for select to authenticated using (bucket_id = 'trade-event-attachments' and exists (select 1 from public.organization_members om where om.organization_id::text = (storage.foldername(name))[1] and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_storage_insert_same_org on storage.objects for insert to authenticated with check (bucket_id = 'trade-event-attachments' and exists (select 1 from public.organization_members om where om.organization_id::text = (storage.foldername(name))[1] and om.user_id = auth.uid() and om.is_active = true));
create policy trade_event_storage_delete_same_org on storage.objects for delete to authenticated using (bucket_id = 'trade-event-attachments' and exists (select 1 from public.organization_members om where om.organization_id::text = (storage.foldername(name))[1] and om.user_id = auth.uid() and om.is_active = true));
