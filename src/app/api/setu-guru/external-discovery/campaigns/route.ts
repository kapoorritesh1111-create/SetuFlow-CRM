import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createDiscoveryCampaign, listExternalDiscovery } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(3).max(120),
});

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET() {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  try {
    const result = await listExternalDiscovery(orgId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[external-discovery-campaigns] list failed', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'External Discovery campaigns could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = CreateCampaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid campaign payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const campaign = await createDiscoveryCampaign(orgId, parsed.data.name);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-campaigns] create failed', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External Discovery campaign could not be created.' },
      { status: 500 },
    );
  }
}
