import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { handleSourceDeletion } from '@/lib/rag/deletion-handler';

/**
 * Module E — CDC Deletion trigger endpoint.
 *
 * Called whenever an upstream entity that has embedded Guru chunks (a
 * document, a product spec sheet, etc.) is deleted, so its vector rows are
 * tombstoned in the same request window as the deletion — not on a lag,
 * which would let a stale chunk keep surfacing in retrieval until some
 * later cleanup job ran.
 *
 * This intentionally skips the preview/approve pattern used by
 * `/api/setu-guru/action`: propagating a tombstone is a cleanup side effect
 * of an already-approved user action (deleting the source document itself),
 * not a new action that needs separate human sign-off.
 */
const RequestSchema = z.object({
  sourceType: z.string().min(1).max(80),
  sourceId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ ok: false, error: 'Missing Supabase configuration.' }, { status: 500 });
  }

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid deletion payload.', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await handleSourceDeletion({
    organizationId: workspace.organization.id,
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    idempotencyKey: parsed.data.idempotencyKey,
    actorUserId: workspace.user.id,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}