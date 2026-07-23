import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { scheduleOpportunityFollowUp, cancelOpportunityFollowUp } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const ScheduleSchema = z.object({
  opportunityId: z.string().uuid(),
  dueAt: z.string().datetime({ offset: true }).or(z.string().min(8)),
  note: z.string().trim().max(500).optional(),
});
const CancelSchema = z.object({ opportunityId: z.string().uuid() });

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = ScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid follow-up payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const dueAtIso = new Date(parsed.data.dueAt).toISOString();
    const result = await scheduleOpportunityFollowUp(orgId, parsed.data.opportunityId, dueAtIso, parsed.data.note ?? null);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-follow-up] schedule failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The follow-up could not be scheduled.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = CancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cancellation payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await cancelOpportunityFollowUp(orgId, parsed.data.opportunityId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[external-discovery-follow-up] cancel failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The follow-up could not be cancelled.' },
      { status: 500 },
    );
  }
}
