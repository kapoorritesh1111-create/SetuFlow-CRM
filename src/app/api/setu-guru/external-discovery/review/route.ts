import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { transitionOpportunityReview } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// S48-GROWTH-012/015: full review lifecycle. Every action writes immutable history
// (external_opportunity_history) and an audit_logs entry — see transitionOpportunityReview.
const ReviewSchema = z.object({
  opportunityId: z.string().uuid(),
  action: z.enum(['start_review', 'verify', 'approve', 'prepare_outreach', 'mark_contacted', 'record_response', 'qualify', 'move_to_nurture', 'reject', 'dismiss', 'archive']),
  note: z.string().trim().max(1000).optional(),
});

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review action.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await transitionOpportunityReview(orgId, parsed.data.opportunityId, parsed.data.action, parsed.data.note);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[external-discovery-review] action failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      action: parsed.data.action,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External opportunity review could not be updated.' },
      { status: 500 },
    );
  }
}
