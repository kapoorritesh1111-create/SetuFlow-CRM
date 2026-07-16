import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

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

    return NextResponse.json({ jobs: data ?? [] });
  } catch (error) {
    console.error('[external-discovery-jobs] list failed', {
      orgId,
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'External Discovery jobs could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });
  }

  const parsed = CreateJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid discovery job payload.', details: parsed.error.flatten() }, { status: 422 });
  }

  const supabase = await createClient();
  const client = supabase as any;

  try {
    const { data: campaign, error: campaignError } = await client
      .from('external_discovery_campaigns')
      .select('id,status,icp_snapshot')
      .eq('org_id', orgId)
      .eq('id', parsed.data.campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Discovery campaign was not found.' }, { status: 404 });
    }

    const idempotencyKey = `${parsed.data.campaignId}:${parsed.data.providerKey}:${JSON.stringify(campaign.icp_snapshot ?? {})}`;
    const { data: job, error: jobError } = await client
      .from('external_discovery_jobs')
      .upsert(
        {
          org_id: orgId,
          campaign_id: parsed.data.campaignId,
          status: 'queued',
          idempotency_key: idempotencyKey,
          provider_key: parsed.data.providerKey,
          provider_request: {
            countries: campaign.icp_snapshot?.target_countries ?? [],
            products: campaign.icp_snapshot?.products ?? [],
            buyerTypes: campaign.icp_snapshot?.buyer_types ?? [],
          },
          attempt_count: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,idempotency_key' },
      )
      .select('*')
      .single();

    if (jobError) throw jobError;

    await client
      .from('external_discovery_campaigns')
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', parsed.data.campaignId);

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-jobs] create failed', {
      orgId,
      campaignId: parsed.data.campaignId,
      providerKey: parsed.data.providerKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'External Discovery job could not be created.' },
      { status: 500 },
    );
  }
}
