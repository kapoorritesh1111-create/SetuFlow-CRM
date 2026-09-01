-- ============================================================================
-- Setu Guru RAG — human-review queue for low-confidence ingestion chunks
-- Module A, Step 3 — Human Review Queue
--
-- FIX APPLIED (P0): Renamed table to `guru_review_queue` to match API/UI expectations.
-- FIX APPLIED (P1): RPC `resolve_guru_review_item` enforces server-side authority, 
--                   preventing browser-side text tampering during approval.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guru_review_queue (
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

-- Optimized index for fast querying by organization and status
CREATE INDEX IF NOT EXISTS guru_review_queue_org_status_idx
  ON public.guru_review_queue (organization_id, status);

-- Enforce Strict Row Level Security
ALTER TABLE public.guru_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru_review_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY "guru_review_queue_select_org_scoped"
  ON public.guru_review_queue
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

-- ============================================================================
-- RPC: Enqueue Review Item
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_guru_review_item(
  p_organization_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_chunk_index int,
  p_content text,
  p_confidence float
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Strict membership guard
  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_organization_id
      USING errcode = '42501';
  END IF;

  INSERT INTO public.guru_review_queue
    (organization_id, source_type, source_id, chunk_index, content, confidence)
  VALUES
    (p_organization_id, p_source_type, p_source_id, p_chunk_index, p_content, p_confidence)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) FROM public;
REVOKE ALL ON FUNCTION public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) FROM anon;
GRANT EXECUTE ON FUNCTION public.enqueue_guru_review_item(uuid, text, uuid, int, text, float) TO authenticated;

-- ============================================================================
-- RPC: Resolve Review Item (Prevents Tampering)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_guru_review_item(
  p_organization_id uuid,
  p_review_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  -- Strict membership guard
  IF NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'not authorized for organization %', p_organization_id
      USING errcode = '42501';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status %, must be approved or rejected', p_status;
  END IF;

  -- Tamper-proof update: We explicitly DO NOT accept 'content' from the client.
  -- The authoritative text remains securely untouched in the database.
  UPDATE public.guru_review_queue
  SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_review_id
    AND organization_id = p_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_guru_review_item(uuid, uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.resolve_guru_review_item(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_guru_review_item(uuid, uuid, text) TO authenticated;