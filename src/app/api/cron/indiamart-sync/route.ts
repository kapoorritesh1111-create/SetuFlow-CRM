import { NextRequest, NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { syncIndiaMartOrganization } from '@/features/integrations/indiamart/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const PROVIDER = 'indiamart';

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false;
  const auth = request.headers.get('authorization') ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret') ?? '';
  return auth === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
}

function asConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function enabledFlag(value: unknown) {
  return value === true || String(value ?? '').trim().toLowerCase() === 'true';
}

async function updateCronHeartbeat(
  db: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  integrationId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await db
    .from('integrations')
    .select('configuration')
    .eq('id', integrationId)
    .maybeSingle();

  if (error) throw new Error(`Unable to read IndiaMART cron heartbeat state: ${error.message}`);
  const configuration = { ...asConfig(data?.configuration), ...patch };
  const { error: updateError } = await db
    .from('integrations')
    .update({ configuration, updated_at: new Date().toISOString() })
    .eq('id', integrationId);

  if (updateError) throw new Error(`Unable to persist IndiaMART cron heartbeat: ${updateError.message}`);
}

export async function GET(request: NextRequest) {
  const requestStartedAt = new Date().toISOString();

  if (!CRON_SECRET) {
    console.error('[IndiaMART cron] CRON_SECRET missing');
    return NextResponse.json({ ok: false, error: 'CRON_SECRET missing on server.' }, { status: 503 });
  }
  if (!authorized(request)) {
    console.error('[IndiaMART cron] Unauthorized request');
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  if (!db) {
    console.error('[IndiaMART cron] Service role unavailable');
    return NextResponse.json({ ok: false, error: 'Service role unavailable.' }, { status: 500 });
  }

  const { data: integrations, error } = await db
    .from('integrations')
    .select('id,organization_id,configuration,is_active')
    .eq('provider', PROVIDER);

  if (error) {
    console.error('[IndiaMART cron] Integration lookup failed', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const providerRows = integrations ?? [];
  const enabled = providerRows.filter((row: any) =>
    row?.is_active === true && enabledFlag(row?.configuration?.sync_enabled),
  );

  console.info('[IndiaMART cron] Tick', {
    requestStartedAt,
    providerRows: providerRows.length,
    enabledOrganizations: enabled.length,
  });

  const results: Array<Record<string, unknown>> = [];

  for (const integration of enabled) {
    const attemptAt = new Date().toISOString();
    try {
      await updateCronHeartbeat(db, integration.id, {
        cron_last_attempt_at: attemptAt,
        cron_last_status: 'running',
        cron_last_error: null,
      });

      const result = await syncIndiaMartOrganization(integration.organization_id);
      const successAt = new Date().toISOString();

      await updateCronHeartbeat(db, integration.id, {
        cron_last_attempt_at: attemptAt,
        cron_last_success_at: successAt,
        cron_last_status: 'success',
        cron_last_error: null,
        cron_last_fetched_count: result.fetched,
        cron_last_inserted_count: result.inserted,
        cron_last_updated_count: result.updated,
      });

      console.info('[IndiaMART cron] Organization sync succeeded', {
        organizationId: integration.organization_id,
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
      });

      results.push({
        organizationId: integration.organization_id,
        ok: true,
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown IndiaMART sync error';
      const failureAt = new Date().toISOString();

      try {
        await updateCronHeartbeat(db, integration.id, {
          cron_last_attempt_at: attemptAt,
          cron_last_failure_at: failureAt,
          cron_last_status: 'failed',
          cron_last_error: message,
        });
      } catch (heartbeatError) {
        console.error('[IndiaMART cron] Failed to persist failure heartbeat', {
          organizationId: integration.organization_id,
          error: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError),
        });
      }

      console.error('[IndiaMART cron] Organization sync failed', {
        organizationId: integration.organization_id,
        error: message,
      });
      results.push({ organizationId: integration.organization_id, ok: false, error: message });
    }
  }

  const failures = results.filter((result) => result.ok === false);
  const body = {
    ok: failures.length === 0,
    requestStartedAt,
    providerRows: providerRows.length,
    organizations: enabled.length,
    failures: failures.length,
    results,
  };

  if (failures.length) {
    return NextResponse.json(body, { status: 500 });
  }

  return NextResponse.json(body);
}
