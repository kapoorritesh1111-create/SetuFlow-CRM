import { NextResponse } from 'next/server';

import { generateRecommendationsForOrganization } from '@/lib/setu-guru/recommendation-generator';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  try {
    const result = await generateRecommendationsForOrganization(organizationId);
    return NextResponse.json({ ok: true, organizationId, ...result });
  } catch (error) {
    console.error('[setu-guru-recommendations] generation failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not refresh recommendations.' }, { status: 500 });
  }
}
