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
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  try {
    const result = await listExternalDiscovery(orgId);
