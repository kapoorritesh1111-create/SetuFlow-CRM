-- ============================================================================
-- Setu Guru RAG — human-review queue for low-confidence ingestion chunks
-- Module A, Step 3 — Human Review Queue
--
-- Follows the same RLS pattern as 20260713000000_guru_rag_embeddings_hardening.sql:
-- enable + force RLS, org-scoped SELECT via is_org_member(), writes go
-- through a SECURITY INVOKER function that fails closed.
-- ============================================================================

create table if not exists public.guru_ingestion_review_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  chunk_index int not null,
  content text not null,
  confidence float not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guru_review_queue_org_status_idx
  on public.guru_ingestion_review_queue (organization_id, status);

alter table public.guru_ingestion_review_queue enable row level security;
alter table public.guru_ingestion_review_queue force row level security;

create policy "guru_review_queue_select_org_scoped"
  on public.guru_ingestion_review_queue
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Writes (insert on ingest, update on review decision) go through RPCs,
-- not direct table policies, matching guru_embeddings' approach.

create or replace function public.enqueue_guru_review_item(
  p_organization_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_chunk_index int,
  p_content text,
  p_confidence float
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization %', p_organization_id
      using errcode = '42501';
  end if;

  insert into public.guru_ingestion_review_queue
    (organization_id, source_type, source_id, chunk_index, content, confidence)
  values
    (p_organization_id, p_source_type, p_source_id, p_chunk_index, p_content, p_confidence)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) from public;
revoke all on function public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) from anon;
grant execute on function public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) to authenticated;

create or replace function public.resolve_guru_review_item(
  p_organization_id uuid,
  p_review_id uuid,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization %', p_organization_id
      using errcode = '42501';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status %, must be approved or rejected', p_status;
  end if;

  update public.guru_ingestion_review_queue
  set status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_review_id
    and organization_id = p_organization_id;
end;
$$;

revoke all on function public.resolve_guru_review_item(uuid, uuid, text) from public;
revoke all on function public.resolve_guru_review_item(uuid, uuid, text) from anon;
grant execute on function public.resolve_guru_review_item(uuid, uuid, text) to authenticated;