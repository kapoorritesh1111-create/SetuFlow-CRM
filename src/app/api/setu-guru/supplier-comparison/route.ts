import { NextResponse } from 'next/server';

import { compareSuppliers } from '@/lib/setu-guru/supplier-comparison';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  try {
    const suppliers = await compareSuppliers(organizationId);
    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('[setu-guru-supplier-comparison] failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Setu Guru could not compare suppliers.' }, { status: 500 });
  }
}
