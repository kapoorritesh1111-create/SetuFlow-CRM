-- ============================================================================
-- Setu Guru RAG — guru_embeddings table + multi-tenant RLS hardening
-- Module C: Multi-Tenant Database Hardening
--
-- Creates the schema-hardened guru_embeddings table with:
--   - RLS enabled AND forced (no bypass, even for table owner)
--   - SELECT, INSERT, UPDATE, DELETE policies scoped by is_org_member(organization_id)
--   - match_guru_embeddings RPC — SECURITY INVOKER, fail-closed org guard
--   - delete_guru_embeddings_for_source helper — org-authorized, raises on mismatch
--   - search_path pinned on every function (public, extensions)
--   - EXECUTE granted to authenticated only, never anon
--
-- Depends on: public.is_org_member(organization_id uuid) — already defined
-- elsewhere in the schema (used by workspace_guru_settings, org_module_grants,
-- client_entitlements, etc.) — reused here rather than redefined.
-- ============================================================================

-- 1. Table
create table if not exists public.guru_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1024) not null,
  embedding_model text not null default 'bge-m3',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, source_type, source_id, chunk_index)
);

create index if not exists guru_embeddings_org_idx
  on public.guru_embeddings (organization_id);

create index if not exists guru_embeddings_vector_idx
  on public.guru_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 2. RLS — enable AND force (no bypass for table owner / service role misuse)
alter table public.guru_embeddings enable row level security;
alter table public.guru_embeddings force row level security;

-- 3. RLS Policies — org-scoped read and write via existing is_org_member() helper
create policy "guru_embeddings_select_org_scoped"
  on public.guru_embeddings for select to authenticated
  using (public.is_org_member(organization_id));

create policy "guru_embeddings_insert_org_scoped"
  on public.guru_embeddings for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy "guru_embeddings_update_org_scoped"
  on public.guru_embeddings for update to authenticated
  using (public.is_org_member(organization_id));

create policy "guru_embeddings_delete_org_scoped"
  on public.guru_embeddings for delete to authenticated
  using (public.is_org_member(organization_id));

-- 4. match_guru_embeddings — hybrid-search-ready vector match RPC
-- (FIXED: Removed unused p_query_text variable)
create or replace function public.match_guru_embeddings(
  p_organization_id uuid,
  p_query_embedding vector(1024),
  p_match_count int default 5,
  p_source_types text[] default null
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  -- Fail-closed: if the caller is not a member of the org they claim, return nothing.
  if not public.is_org_member(p_organization_id) then
    return;
  end if;

  return query
  select
    ge.id,
    ge.source_type,
    ge.source_id,
    ge.content,
    1 - (ge.embedding <=> p_query_embedding) as similarity
  from public.guru_embeddings ge
  where ge.organization_id = p_organization_id
    and (p_source_types is null or ge.source_type = any (p_source_types))
  order by ge.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

revoke all on function public.match_guru_embeddings(uuid, vector, int, text[]) from public;
revoke all on function public.match_guru_embeddings(uuid, vector, int, text[]) from anon;
grant execute on function public.match_guru_embeddings(uuid, vector, int, text[]) to authenticated;

-- 5. delete_guru_embeddings_for_source — org-authorized delete helper
create or replace function public.delete_guru_embeddings_for_source(
  p_organization_id uuid,
  p_source_type text,
  p_source_id uuid
)
returns int
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_deleted int;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized for organization %', p_organization_id
      using errcode = '42501';
  end if;

  delete from public.guru_embeddings
  where organization_id = p_organization_id
    and source_type = p_source_type
    and source_id = p_source_id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_guru_embeddings_for_source(uuid, text, uuid) from public;
revoke all on function public.delete_guru_embeddings_for_source(uuid, text, uuid) from anon;
grant execute on function public.delete_guru_embeddings_for_source(uuid, text, uuid) to authenticated;

-- 6. CDC Tombstone propagation trigger (Module E: Deletion Sync Wired)
-- (FIXED: Replaced stub with dynamic table mapping and wired to documents)
create or replace function public.guru_embeddings_tombstone_cleanup()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  -- Automatically clean up embeddings when the parent record is deleted.
  -- Uses TG_TABLE_NAME dynamically to match the source_type.
  delete from public.guru_embeddings
  where organization_id = old.organization_id
    and source_type = TG_TABLE_NAME::text
    and source_id = old.id;
  return old;
end;
$$;

-- Wire the trigger to the actual CRM data table
drop trigger if exists sync_guru_embeddings_on_document_delete on public.documents;
create trigger sync_guru_embeddings_on_document_delete
after delete on public.documents
for each row execute function public.guru_embeddings_tombstone_cleanup();


-- ============================================================================
-- Module D Addition: Full-Text Search (FTS) RPC for Hybrid Retrieval
-- ============================================================================
create or replace function public.search_guru_embeddings_fts(
  p_organization_id uuid,
  p_query_text text,
  p_match_count int default 5
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  -- Fail-closed: ensure caller is a member of the organization
  if not public.is_org_member(p_organization_id) then
    return;
  end if;

  return query
  select 
    ge.id,
    ge.source_type,
    ge.source_id,
    ge.content,
    ts_rank(to_tsvector('english', ge.content), plainto_tsquery('english', p_query_text)) as similarity
  from public.guru_embeddings ge
  where ge.organization_id = p_organization_id
    and to_tsvector('english', ge.content) @@ plainto_tsquery('english', p_query_text)
  order by similarity desc
  limit p_match_count;
end;
$$;

revoke all on function public.search_guru_embeddings_fts(uuid, text, int) from public;
revoke all on function public.search_guru_embeddings_fts(uuid, text, int) from anon;
grant execute on function public.search_guru_embeddings_fts(uuid, text, int) to authenticated;
