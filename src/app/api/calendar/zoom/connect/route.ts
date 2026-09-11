import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { createZoomOAuthState } from '@/lib/calendar/zoom';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return NextResponse.redirect(new URL('/login', req.url));
  const clientId = String(process.env.ZOOM_CLIENT_ID || '').trim();
  if (!clientId) return NextResponse.json({ error: 'Zoom connection is not configured.' }, { status: 503 });

  let state: string;
  try {
    state = createZoomOAuthState({ userId: workspace.user.id, organizationId: workspace.organization.id });
  } catch {
    return NextResponse.json({ error: 'Zoom connection is not configured.' }, { status: 503 });
  }

  const redirectUri = `${req.nextUrl.origin}/api/calendar/zoom/callback`;
  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return NextResponse.redirect(url);
}
