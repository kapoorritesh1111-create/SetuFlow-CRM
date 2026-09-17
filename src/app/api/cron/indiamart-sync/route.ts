import { NextRequest, NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { syncIndiaMartOrganization } from '@/features/integrations/indiamart/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false;
  const auth = request.headers.get('authorization') ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret') ?? '';
  return auth === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET missing on server.' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Service role unavailable.' }, { status: 500 });

  const { data: integrations, error } = await db
    .from('integrations')
    .select('organization_id,configuration,is_active')
    .eq('provider', 'indiamart')
    .eq('is_active', true);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const enabled = (integrations ?? []).filter((row: any) => Boolean(row?.configuration?.sync_enabled));
  const results = [];
  for (const integration of enabled) {
    try {
      const result = await syncIndiaMartOrganization(integration.organization_id);
      results.push({ organizationId: integration.organization_id, ok: true, fetched: result.fetched, inserted: result.inserted, updated: result.updated });
    } catch (error) {
      results.push({ organizationId: integration.organization_id, ok: false, error: error instanceof Error ? error.message : 'Unknown IndiaMART sync error' });
    }
  }

  return NextResponse.json({ ok: true, organizations: enabled.length, results });
}
