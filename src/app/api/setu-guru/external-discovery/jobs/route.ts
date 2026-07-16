import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { runDiscoveryJob } from '@/lib/setu-guru/external-discovery';
import { listDiscoveryProviders } from '@/lib/setu-guru/discovery-providers';

export const dynamic = 'force-dynamic';

const CreateJobSchema = z.object({
  campaignId: z.string().uuid(),
  providerKey: z.string().trim().min(2).max(80),
});

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const campaignId = request.nextUrl.searchParams.get('campaign_id');
  const supabase = await createClient();
  const client = supabase as any;

  try {
    let query = client
      .from('external_discovery_jobs')
      .select('id,campaign_id,status,provider_key,provider_request,provider_response,cost_amount,cost_currency,attempt_count,last_error,started_at,completed_at,created_at,updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (campaignId) {
      if (!z.string().uuid().safeParse(campaignId).success) {
        return NextResponse.json({ error: 'campaign_id must be a valid UUID.' }, { status: 422 });
      }
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ jobs: data ?? [], providers: listDiscoveryProviders().map((p) => ({ key: p.key, label: p.label, configured: p.configured })) });
  } catch (error) {
    console.error('[external-discovery-jobs] list failed', {
      orgId,
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'External Discovery jobs could not be loaded.' }, { status: 500 });
  }
}

// S48-GROWTH-011/013: creates (or reuses via idempotency key) a job and runs the selected
// provider inline through the registry. See runDiscoveryJob for the full lifecycle — it never
// creates leads and never sends outbound communication.
export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = CreateJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid discovery job payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await runDiscoveryJob(orgId, parsed.data.campaignId, parsed.data.providerKey);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-jobs] run failed', {
      orgId,
      campaignId: parsed.data.campaignId,
      providerKey: parsed.data.providerKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External Discovery job could not be run.' },
      { status: 500 },
    );
  }
}
