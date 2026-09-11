import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { verifyZoomOAuthState, zoomApi } from '@/lib/calendar/zoom';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return NextResponse.redirect(new URL('/login', req.url));
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !verifyZoomOAuthState(state, { userId: workspace.user.id, organizationId: workspace.organization.id })) return NextResponse.redirect(new URL('/calendar?zoom=failed', req.url));

  const clientId = String(process.env.ZOOM_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.ZOOM_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/calendar?zoom=not-configured', req.url));

  const redirectUri = `${req.nextUrl.origin}/api/calendar/zoom/callback`;
  const tokenResponse = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    cache: 'no-store',
  });
  const tokens = await tokenResponse.json().catch(() => ({})) as any;
  if (!tokenResponse.ok || !tokens.access_token) return NextResponse.redirect(new URL('/calendar?zoom=failed', req.url));

  let me: any = null;
  try { me = await zoomApi(tokens.access_token, '/users/me'); } catch { /* connection remains usable without profile enrichment */ }
  const db = createServiceRoleClient();
  if (!db) return NextResponse.redirect(new URL('/calendar?zoom=failed', req.url));
  const { error } = await db.from('meeting_connections').upsert({
    organization_id: workspace.organization.id,
    user_id: workspace.user.id,
    provider: 'zoom',
    provider_account_id: tokens.account_id || null,
    provider_user_id: me?.id || null,
    account_email: me?.email || null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
    scopes: tokens.scope || null,
    status: 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,user_id,provider' });
  if (error) return NextResponse.redirect(new URL('/calendar?zoom=failed', req.url));
  return NextResponse.redirect(new URL('/calendar?zoom=connected', req.url));
}
