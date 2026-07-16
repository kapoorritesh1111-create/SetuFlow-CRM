import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOpportunityHistory, requestDeeperResearch } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const opportunityId = request.nextUrl.searchParams.get('opportunityId');
  if (!opportunityId || !z.string().uuid().safeParse(opportunityId).success) {
    return NextResponse.json({ error: 'opportunityId must be a valid UUID.' }, { status: 422 });
  }

  try {
    const history = await getOpportunityHistory(orgId, opportunityId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('[external-discovery-history] failed', {
      orgId,
      opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'History could not be loaded.' }, { status: 500 });
  }
}

const RequestResearchSchema = z.object({ opportunityId: z.string().uuid(), note: z.string().trim().min(1).max(500) });

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = RequestResearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await requestDeeperResearch(orgId, parsed.data.opportunityId, parsed.data.note);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-history] request research failed', {
      orgId,
      opportunityId: parsed.data.opportunityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'The research request could not be saved.' }, { status: 500 });
  }
}
