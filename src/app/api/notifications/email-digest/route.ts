import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { sendDailyNotificationDigest } from '@/lib/notifications/email-service';

export const dynamic = 'force-dynamic';

type DigestRequestBody = {
  sinceHours?: number;
  limit?: number;
};

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export async function POST(request: NextRequest) {
  const workspace = await getCurrentWorkspace();

  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return NextResponse.json({ error: 'Authentication and active organization membership are required.' }, { status: 401 });
  }

  let body: DigestRequestBody = {};
  try {
    body = (await request.json()) as DigestRequestBody;
  } catch {
    body = {};
  }

  const sinceHours = clampNumber(body.sinceHours, 24, 1, 168);
  const limit = clampNumber(body.limit, 25, 1, 100);
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const result = await sendDailyNotificationDigest({
    organizationId: workspace.organization.id,
    userId: workspace.user.id,
    since,
    limit,
  });

  return NextResponse.json({
    status: result.status,
    sent: result.sent,
    count: result.count,
    error: result.error,
    since: since.toISOString(),
    limit,
  });
}
