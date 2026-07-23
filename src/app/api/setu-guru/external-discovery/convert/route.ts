import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { convertOpportunityToLead } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const ConvertSchema = z.object({
  opportunityId: z.string().uuid(),
  leadType: z.enum(['buyer', 'supplier']),
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

  const parsed = ConvertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid conversion payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await convertOpportunityToLead(orgId, parsed.data.opportunityId, parsed.data.leadType);
    return NextResponse.json(result, { status: result.alreadyConverted ? 200 : 201 });
  } catch (error) {
    console.error('[external-discovery-convert] failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The opportunity could not be converted to a lead.' },
      { status: 500 },
    );
  }
}
