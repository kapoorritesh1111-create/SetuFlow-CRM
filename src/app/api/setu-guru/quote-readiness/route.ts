import { NextRequest, NextResponse } from 'next/server';

import { getQuoteReadiness } from '@/lib/setu-guru/quote-readiness';
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
    const readiness = await getQuoteReadiness(organizationId, leadId);
    if (!readiness) {
      return NextResponse.json({ error: 'Lead not found in the active organization.' }, { status: 404 });
    }
    return NextResponse.json({ readiness });
  } catch (error) {
    console.error('[setu-guru-quote-readiness] failed', {
      organizationId,
      leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not load quote readiness.' }, { status: 500 });
  }
}
