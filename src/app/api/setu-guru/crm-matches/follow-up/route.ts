import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { scheduleLeadFollowUp, cancelLeadFollowUp } from '@/lib/setu-guru/crm-matches-actions';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const ScheduleSchema = z.object({
  leadId: z.string().uuid(),
  dueAt: z.string().datetime({ offset: true }).or(z.string().min(8)),
  note: z.string().trim().max(500).optional(),
});
const CancelSchema = z.object({ leadId: z.string().uuid(), recommendationId: z.string().uuid() });

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
    const result = await scheduleLeadFollowUp(orgId, parsed.data.leadId, dueAtIso, parsed.data.note ?? null);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[crm-matches-follow-up] schedule failed', {
      orgId,
      leadId: parsed.data.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The follow-up could not be scheduled.' }, { status: 500 });
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
    await cancelLeadFollowUp(orgId, parsed.data.leadId, parsed.data.recommendationId);
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error('[crm-matches-follow-up] cancel failed', {
      orgId,
      leadId: parsed.data.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The follow-up could not be cancelled.' }, { status: 500 });
  }
}
