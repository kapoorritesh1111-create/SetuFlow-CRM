import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const workspace = await requireWorkspace();
  const orgId = workspace.organization?.id;
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const rawProfileId = request.nextUrl.searchParams.get('profile_id');
  const profileId = rawProfileId && z.string().uuid().safeParse(rawProfileId).success ? rawProfileId : null;
  try {
    return NextResponse.json(await listTopFitOpportunities(orgId, 1000, profileId));
  } catch (error) {
    console.error('[crm-matches] load failed', { orgId, profileId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'CRM matches could not be recalculated.' }, { status: 500 });
  }
}
