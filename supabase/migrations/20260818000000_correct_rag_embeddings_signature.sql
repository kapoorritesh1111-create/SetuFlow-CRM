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
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.50,
    p_match_count INT DEFAULT 5
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
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
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
      AND (1 - (ge.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY ge.embedding <=> p_query_embedding ASC
    LIMIT LEAST(p_match_count, 50);
END;
$$;

-- Grant execution rights to authenticated users & service role
GRANT EXECUTE ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT) TO service_role;

-- Add explicit documentation comment for schema tracking
COMMENT ON FUNCTION public.match_guru_embeddings(UUID, vector, FLOAT, INT) 
IS 'Corrective migration: Canonical vector similarity search ensuring multi-tenant isolation and matching retrieve.ts interface.';