-- ============================================================================
-- Migration: Corrective Patch for RAG Embeddings Signature & Isolation (Issues #8, #9)
-- Description: Ensures deterministic function signature, aligns vector distance metrics,
--              and guarantees strictly scoped multi-tenant RAG search.
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop previous overloaded signatures to avoid ambigous RPC execution
DROP FUNCTION IF EXISTS public.match_guru_embeddings(UUID, vector, FLOAT, INT);
DROP FUNCTION IF EXISTS public.match_guru_embeddings(UUID, vector, FLOAT, INT, TEXT);

-- Production-grade RPC function definition with explicit parameter typing & search safety
CREATE OR REPLACE FUNCTION public.match_guru_embeddings(
    p_organization_id UUID,
    p_query_embedding vector(1024), -- FIX: Changed from 1536 to 1024 to match BGE-M3 model
    p_match_threshold FLOAT DEFAULT 0.50,
    p_match_count INT DEFAULT 5,
    p_source_types TEXT DEFAULT NULL -- FIX: Added back to match retrieveGuru TypeScript contract
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    source_type TEXT,
    source_id TEXT,
    chunk_index INT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER -- FIX: Restored SECURITY INVOKER for tenant isolation
SET search_path = public, extensions
AS $$
BEGIN
    -- FIX: Explicit organization membership guard to prevent cross-tenant data leaks
    IF NOT public.is_org_member(p_organization_id) THEN
        RAISE EXCEPTION 'Access denied: User is not a member of the requested organization.';
    END IF;

    RETURN QUERY
    SELECT 
        ge.id,
        ge.organization_id,
        ge.source_type,
        ge.source_id,
        ge.chunk_index,
        ge.content,
        ge.metadata,
        (1 - (ge.embedding <=> p_query_embedding))::FLOAT AS similarity
    FROM public.guru_embeddings ge
    WHERE ge.organization_id = p_organization_id
      AND (p_source_types IS NULL OR ge.source_type = ANY(string_to_array(p_source_types, ',')))
      AND (1 - (ge.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY ge.embedding <=> p_query_embedding ASC
    LIMIT LEAST(p_match_count, 50);
END;
$$;

-- Grant execution rights to authenticated users & service role
GRANT EXECUTE ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT, TEXT) TO service_role;

-- Add explicit documentation comment for schema tracking
COMMENT ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT, TEXT) 
IS 'Corrective migration: Canonical vector similarity search ensuring multi-tenant isolation (1024 dim) and matching retrieve.ts interface.';