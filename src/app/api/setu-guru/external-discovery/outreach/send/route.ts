import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sendOutreachDraft } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const SendSchema = z.object({ draftId: z.string().uuid(), opportunityId: z.string().uuid() });

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = SendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid send payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await sendOutreachDraft(orgId, parsed.data.draftId, parsed.data.opportunityId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[external-discovery-outreach-send] failed', {
      orgId,
      draftId: parsed.data.draftId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The draft could not be sent.' },
      { status: 500 },
    );
  }
}
