import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const ORGANIZATION_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const ENDPOINT = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';
const PROVIDER = 'indiamart';
const PROBE_TOKEN_SHA256 = '04dfc14832870a90852ddad6fa4840af1b89498f2aa28e6fce83f0902811da6a';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatIndiaMartTime(date: Date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(date.getUTCDate())}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export async function GET(request: NextRequest) {
  const suppliedToken = request.nextUrl.searchParams.get('token') ?? '';
  const suppliedHash = createHash('sha256').update(suppliedToken).digest('hex');
  if (suppliedHash !== PROBE_TOKEN_SHA256) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role unavailable' }, { status: 500 });

  const { data: credential, error: credentialError } = await admin.rpc('get_integration_credential_service', {
    p_organization_id: ORGANIZATION_ID,
    p_provider: PROVIDER,
    p_credential_type: 'crm_key',
  });
  if (credentialError || !credential) {
    return NextResponse.json({ ok: false, error: credentialError?.message ?? 'credential unavailable' }, { status: 500 });
  }

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windows: Array<{ start: Date; end: Date }> = [];
  let cursor = start;
  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + 7 * 24 * 60 * 60 * 1000, end.getTime()));
    windows.push({ start: cursor, end: next });
    cursor = next;
  }

  const results = [];
  let total = 0;
  for (const window of windows) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('glusr_crm_key', String(credential));
    url.searchParams.set('start_time', formatIndiaMartTime(window.start));
    url.searchParams.set('end_time', formatIndiaMartTime(window.end));

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'SetuFlow-IndiaMART-DryRun/1.0' },
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const records = Array.isArray(body.RESPONSE)
      ? body.RESPONSE
      : Array.isArray(body.DATA)
        ? body.DATA
        : Array.isArray(body.data)
          ? body.data
          : [];
    const count = numeric(body.TOTAL_RECORDS ?? body.total_records ?? body.totalRecords) ?? records.length;
    const code = numeric(body.CODE ?? body.code);
    const message = text(body.MESSAGE ?? body.message) ?? 'IndiaMART response received';
    if (!response.ok || (code !== null && code !== 200 && code !== 204)) {
      return NextResponse.json({
        ok: false,
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        httpStatus: response.status,
        code,
        message,
      }, { status: 502 });
    }
    total += count;
    results.push({
      windowStart: window.start.toISOString(),
      windowEnd: window.end.toISOString(),
      count,
      code,
      message,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun: true,
    imported: false,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    total,
    windows: results,
  });
}
