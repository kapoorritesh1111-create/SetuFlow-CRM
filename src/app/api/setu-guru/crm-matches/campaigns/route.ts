import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createCrmMatchCampaign, listCrmMatchCampaigns, markCrmMatchCampaignRun } from '@/lib/setu-guru/crm-match-campaigns';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const FiltersSchema = z.object({
  type: z.enum(['all', 'buyer', 'supplier']).optional(),
  country: z.string().max(120).optional(),
  source: z.string().max(120).optional(),
  owner: z.enum(['all', 'mine']).optional(),
  contact: z.enum(['all', 'contacted', 'not_contacted']).optional(),
  minFit: z.number().int().min(0).max(100).optional(),
  query: z.string().max(200).optional(),
}).optional();

const CreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  profileId: z.string().uuid().nullish(),
  filters: FiltersSchema,
});

const RunSchema = z.object({ campaignId: z.string().uuid() });

async function orgId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET() {
  const organizationId = await orgId();
  if (!organizationId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  try {
    return NextResponse.json({ campaigns: await listCrmMatchCampaigns(organizationId) });
  } catch (error) {
    console.error('[crm-match-campaigns] list failed', { organizationId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'CRM match campaigns could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const organizationId = await orgId();
  if (!organizationId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign payload.', details: parsed.error.flatten() }, { status: 422 });
  try {
    const campaign = await createCrmMatchCampaign(organizationId, parsed.data);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('[crm-match-campaigns] create failed', { organizationId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM match campaign could not be created.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const organizationId = await orgId();
  if (!organizationId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  const parsed = RunSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign run payload.' }, { status: 422 });
  try {
    await markCrmMatchCampaignRun(organizationId, parsed.data.campaignId);
    return NextResponse.json({ ran: true });
  } catch (error) {
    console.error('[crm-match-campaigns] run failed', { organizationId, campaignId: parsed.data.campaignId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'CRM match campaign could not be run.' }, { status: 500 });
  }
}
