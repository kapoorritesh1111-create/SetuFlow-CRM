import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { DiscoveryExecutionError, runConfirmedDiscoveryJob } from '@/lib/setu-guru/external-discovery-runner';
import { getDefaultDiscoveryProvider, listDiscoveryProviders } from '@/lib/setu-guru/discovery-providers';

export const dynamic = 'force-dynamic';

const CreateJobSchema = z.object({
  campaignId: z.string().uuid(),
  providerKey: z.string().trim().min(2).max(80).optional(),
}).strict();

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

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
      if (!z.string().uuid().safeParse(campaignId).success) return NextResponse.json({ error: 'campaign_id must be a valid UUID.' }, { status: 422 });
      query = query.eq('campaign_id', campaignId);
    }
    const { data, error } = await query;
    if (error) throw error;
    const providers = listDiscoveryProviders().map((provider) => ({ key: provider.key, label: provider.label, configured: provider.configured, capabilities: provider.capabilities }));
    const defaultProvider = getDefaultDiscoveryProvider();
    return NextResponse.json({ jobs: data ?? [], providers, defaultProviderKey: defaultProvider.key, licensedProviderReady: defaultProvider.key !== 'manual' && defaultProvider.configured });
  } catch (error) {
    console.error('[external-discovery-jobs] list failed', { orgId, campaignId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'External Discovery jobs could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const parsed = CreateJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid discovery job payload.', details: parsed.error.flatten() }, { status: 422 });

  try {
    const requested = parsed.data.providerKey;
    const configured = listDiscoveryProviders().find((provider) => provider.key === requested && provider.configured);
    const provider = configured ?? getDefaultDiscoveryProvider();
    const result = await runConfirmedDiscoveryJob(orgId, parsed.data.campaignId, provider.key);
    return NextResponse.json({ result: { ...result, providerKey: provider.key, providerLabel: provider.label } }, { status: 201 });
  } catch (error) {
    const status = error instanceof DiscoveryExecutionError ? error.status : 500;
    const outcome = error instanceof DiscoveryExecutionError ? error.outcome : 'failed';
    const details = error instanceof DiscoveryExecutionError ? error.details : undefined;
    console.error('[external-discovery-jobs] run failed', { orgId, campaignId: parsed.data.campaignId, providerKey: parsed.data.providerKey, status, outcome, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'External Discovery job could not be run.',
      outcome,
      details,
    }, { status });
  }
}
