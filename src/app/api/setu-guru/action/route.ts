import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildActionPreview, executeApprovedAction } from '@/lib/setu-guru/action-layer';

const ActionSchema = z.object({
  actionType: z.enum(['apply_hsn', 'queue_payment_request', 'queue_freight_request', 'queue_finance_handoff', 'flag_lead_for_review', 'draft_dispatch_checklist']),
  entityId: z.string().uuid(),
  entityType: z.string().max(80),
  payload: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(8).max(120),
  approved: z.boolean().default(false),
});

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ ok: false, error: 'Missing Supabase configuration.' }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ ok: false, error: 'Sign in before using Setu Guru actions.' }, { status: 401 });

  const parsed = ActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid action payload.', details: parsed.error.flatten() }, { status: 422 });

  const { actionType, entityId, entityType, payload, idempotencyKey, approved } = parsed.data;

  // Always return preview first unless explicitly approved
  if (!approved) {
    const preview = buildActionPreview({ actionType, organizationId: workspace.organization.id, entityId, entityType, payload, idempotencyKey });
    return NextResponse.json({ ok: true, preview, requiresApproval: true });
  }

  const result = await executeApprovedAction({
    actionType, entityId, entityType, payload, idempotencyKey,
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
