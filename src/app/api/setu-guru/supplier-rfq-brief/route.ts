import { NextRequest, NextResponse } from 'next/server';

import { generateSupplierRfqBrief } from '@/lib/setu-guru/supplier-rfq-assistant';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const leadId = request.nextUrl.searchParams.get('leadId');
  if (!leadId) {
    return NextResponse.json({ error: 'A leadId query parameter is required.' }, { status: 422 });
  }

  try {
    const brief = await generateSupplierRfqBrief(organizationId, leadId);
    if (!brief) {
      return NextResponse.json({ error: 'Supplier not found in the active organization.' }, { status: 404 });
    }
    return NextResponse.json({ brief });
  } catch (error) {
    console.error('[setu-guru-supplier-rfq-brief] failed', {
      organizationId,
      leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not draft an RFQ brief.' }, { status: 500 });
  }
}
