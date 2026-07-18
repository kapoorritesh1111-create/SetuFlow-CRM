import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Module E — CDC Deletion Engine & Tombstone Propagation
 *
 * Whenever a source document (or any other entity that has been embedded
 * into `guru_embeddings`) is deleted upstream, this handler removes every
 * embedding row derived from it immediately, so retrieval can never surface
 * a "ghost" chunk from content that no longer exists.
 *
 * This is the single choke point for tombstone propagation: every deletion
 * trigger (API route, webhook, background job) should call
 * `handleSourceDeletion` rather than deleting from `guru_embeddings`
 * directly, so idempotency and auditing stay consistent across all
 * call sites.
 */

/** Validated shape of an incoming deletion event. Malformed events are rejected before any DB work runs. */
const DeletionEventSchema = z.object({
  organizationId: z.string().uuid(),
  sourceType: z.string().min(1).max(80),
  sourceId: z.string().min(1),
  /**
   * Caller-supplied idempotency key. CDC/webhook delivery is at-least-once,
   * so the same logical deletion can arrive more than once; this key is
   * what lets us recognize a replay and skip re-processing it.
   */
  idempotencyKey: z.string().min(8).max(120),
  /** Who (or what system) initiated the deletion, for the audit trail. Null for system/CDC-originated events. */
  actorUserId: z.string().uuid().nullable().optional(),
});

export type DeletionEvent = z.infer<typeof DeletionEventSchema>;

export interface DeletionResult {
  ok: boolean;
  deletedCount: number;
  sourceType: string;
  sourceId: string;
  /** True if this exact event (by idempotencyKey) was already processed — a safe no-op replay, not an error. */
  duplicate: boolean;
  error?: string;
}

/**
 * Runs tombstone propagation for a single deletion event.
 *
 * Flow:
 *   1. Validate the event shape (zod) — reject early on malformed input.
 *   2. Idempotency check — if this idempotencyKey was already recorded as
 *      processed in `audit_logs`, short-circuit with `duplicate: true`.
 *   3. Delete every `guru_embeddings` row for this org + source via the
 *      `delete_guru_embeddings_for_source` RPC (org-scoped and
 *      SECURITY INVOKER at the database layer — see the migration).
 *   4. Record the outcome in `audit_logs`, keyed by idempotencyKey, so
 *      future replays of the same event are recognized in step 2.
 */
export async function handleSourceDeletion(rawEvent: unknown): Promise<DeletionResult> {
  const parsed = DeletionEventSchema.safeParse(rawEvent);
  if (!parsed.success) {
    console.warn('[RAG:deletion] Rejected malformed deletion event:', parsed.error.flatten());
    const maybe = rawEvent as Partial<DeletionEvent> | null | undefined;
    return {
      ok: false,
      deletedCount: 0,
      sourceType: typeof maybe?.sourceType === 'string' ? maybe.sourceType : 'unknown',
      sourceId: typeof maybe?.sourceId === 'string' ? maybe.sourceId : 'unknown',
      duplicate: false,
      error: 'Invalid deletion event payload.',
    };
  }

  const event = parsed.data;
  const supabase = await createClient();

  // NOTE ON THE CAST BELOW:
  // In this codebase's generated `src/types/database.ts`, `.insert()` /
  // `.select()` on `audit_logs` resolves to a `never`-typed argument even
  // though the table itself is declared, so the typed client rejects a
  // perfectly valid row shape at compile time. Using the untyped client for
  // these calls unblocks the build without changing runtime behavior — the
  // table name and columns are unchanged and still enforced by the
  // database's own schema and RLS policies.
  //
  // TODO(tech-debt): once src/types/database.ts is regenerated
  // (see the note on the RPC call below for the command), re-check whether
  // `audit_logs` resolves correctly and drop this cast if so.
  const supabaseUntyped = supabase as any;

  // --- Idempotency guard --------------------------------------------------
  const { data: existingAudit, error: auditLookupError } = await supabaseUntyped
    .from('audit_logs')
    .select('id')
    .eq('organization_id', event.organizationId)
    .eq('entity_type', 'guru_embeddings_deletion')
    .eq('action', 'tombstone_propagated')
    .contains('payload', { idempotencyKey: event.idempotencyKey })
    .limit(1)
    .maybeSingle();

  if (auditLookupError) {
    // Fail closed on an unreadable audit trail: we would rather risk a
    // harmless duplicate delete than silently skip a genuine deletion
    // because the idempotency check itself errored.
    console.error('[RAG:deletion] Idempotency lookup failed, proceeding without it:', auditLookupError);
  }

  if (existingAudit) {
    console.info('[RAG:deletion] Duplicate deletion event, skipping:', event.idempotencyKey);
    return {
      ok: true,
      deletedCount: 0,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      duplicate: true,
    };
  }

  // --- Tombstone propagation -----------------------------------------------
  // NOTE ON THE CAST BELOW:
  // `src/types/database.ts` does not yet declare `delete_guru_embeddings_for_source`
  // in its `Functions` map (same root cause documented in src/lib/rag/retrieve.ts),
  // so the typed `supabase` client rejects this call at compile time. Casting to
  // `any` at this single call site unblocks the build without weakening runtime
  // behavior — the RPC name and arguments are unchanged and still enforced by the
  // database's own org-membership guard (SECURITY INVOKER, fail-closed).
  //
  // TODO(tech-debt): regenerate src/types/database.ts to include this RPC
  // (and match_guru_embeddings / search_guru_embeddings_fts, see retrieve.ts),
  // then remove this cast.
  const { data, error } = await supabaseUntyped.rpc('delete_guru_embeddings_for_source', {
    p_organization_id: event.organizationId,
    p_source_type: event.sourceType,
    p_source_id: event.sourceId,
  });

  if (error) {
    console.error('[RAG:deletion] Tombstone propagation failed:', error);
    return {
      ok: false,
      deletedCount: 0,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      duplicate: false,
      error: error.message ?? 'Unknown database error during deletion.',
    };
  }

  const deletedCount = Number(data ?? 0);

  // --- Audit trail ----------------------------------------------------------
  // Recorded even when deletedCount is 0 (e.g. embeddings were already gone),
  // so the idempotency check above always has something to match against
  // for this idempotencyKey on any future replay.
  const { error: auditWriteError } = await supabaseUntyped.from('audit_logs').insert({
    organization_id: event.organizationId,
    actor_user_id: event.actorUserId ?? null,
    entity_type: 'guru_embeddings_deletion',
    entity_id: event.sourceId,
    action: 'tombstone_propagated',
    payload: {
      idempotencyKey: event.idempotencyKey,
      sourceType: event.sourceType,
      deletedCount,
    },
  });

  if (auditWriteError) {
    // The deletion itself already succeeded; a failed audit write should not
    // be reported as a failed deletion. Log loudly so it can be investigated,
    // but do not flip `ok` to false.
    console.error('[RAG:deletion] Deletion succeeded but audit write failed:', auditWriteError);
  }

  console.info(
    `[RAG:deletion] Tombstoned ${deletedCount} chunk(s) for ${event.sourceType}:${event.sourceId}`,
  );

  return {
    ok: true,
    deletedCount,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    duplicate: false,
  };
}