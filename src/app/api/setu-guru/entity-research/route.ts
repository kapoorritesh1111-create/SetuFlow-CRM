import { NextRequest, NextResponse } from 'next/server';

import { generateBuyerResearch, generateSupplierResearch } from '@/lib/setu-guru/entity-research';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const leadId = request.nextUrl.searchParams.get('leadId');
  const entityType = request.nextUrl.searchParams.get('entityType') === 'supplier' ? 'supplier' : 'buyer';

  if (!leadId) {
    return NextResponse.json({ error: 'A leadId query parameter is required.' }, { status: 422 });
  }

  try {
    const result = entityType === 'supplier'
      ? await generateSupplierResearch(organizationId, leadId)
      : await generateBuyerResearch(organizationId, leadId);

    if (!result) {
      return NextResponse.json({ error: 'Record not found in the active organization.' }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[setu-guru-entity-research] failed', {
      organizationId,
      leadId,
      entityType,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not generate a research summary.' }, { status: 500 });
  }
}
