-- ============================================================================
-- Setu Guru RAG — guru_embeddings table + multi-tenant RLS hardening
-- Module C: Multi-Tenant Database Hardening
--
-- Creates the schema-hardened guru_embeddings table with:
--   - RLS enabled AND forced (no bypass, even for table owner)
--   - SELECT policy scoped by is_org_member(organization_id)
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

-- 3. SELECT policy — org-scoped read via existing is_org_member() helper
create policy "guru_embeddings_select_org_scoped"
  on public.guru_embeddings
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Insert/update/delete are NOT exposed via direct table policies —
-- all writes go through the SECURITY INVOKER RPCs below, which re-check
-- org membership explicitly and fail closed.

-- 4. match_guru_embeddings — hybrid-search-ready vector match RPC
create or replace function public.match_guru_embeddings(
  p_organization_id uuid,
  p_query_embedding vector(1024),
  p_query_text text,
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

revoke all on function public.match_guru_embeddings(uuid, vector, text, int, text[]) from public;
revoke all on function public.match_guru_embeddings(uuid, vector, text, int, text[]) from anon;
grant execute on function public.match_guru_embeddings(uuid, vector, text, int, text[]) to authenticated;

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

-- 6. Tombstone propagation trigger stub (Module E hooks into this later) —
-- included here because it also touches guru_embeddings and must stay
-- org-filtered per the isolation test suite's blanket check.
create or replace function public.guru_embeddings_tombstone_cleanup()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  delete from public.guru_embeddings
  where organization_id = old.organization_id
    and source_type = old.source_type
    and source_id = old.source_id;
  return old;
end;
$$;
