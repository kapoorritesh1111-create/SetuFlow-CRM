import { NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getTelemetrySummary } from '@/lib/setu-guru/telemetry';

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeTelemetry = url.searchParams.get('telemetry') === '1';

  if (!includeTelemetry || !hasSupabaseEnv) {
    return NextResponse.json({ status: 'ok', guru: 'online' });
  }

  const workspace = await getWorkspaceAccess().catch(() => null);
  if (!workspace?.user || !workspace.organization) {
    return NextResponse.json({ status: 'ok', guru: 'online' });
  }

  const telemetry = await getTelemetrySummary(workspace.organization.id);
  return NextResponse.json({ status: 'ok', guru: 'online', telemetry });
}
