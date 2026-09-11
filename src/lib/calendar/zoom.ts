import { createHmac, timingSafeEqual } from 'crypto';

type ZoomState = { u: string; o: string; t: number };

function stateSecret() {
  return String(process.env.ZOOM_OAUTH_STATE_SECRET || process.env.ZOOM_CLIENT_SECRET || '').trim();
}

export function createZoomOAuthState(input: { userId: string; organizationId: string }) {
  const secret = stateSecret();
  if (!secret) throw new Error('Zoom connection is not configured.');
  const payload = Buffer.from(JSON.stringify({ u: input.userId, o: input.organizationId, t: Date.now() } satisfies ZoomState)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyZoomOAuthState(value: string | null, expected: { userId: string; organizationId: string }, maxAgeMs = 10 * 60 * 1000) {
  const secret = stateSecret();
  if (!secret || !value) return false;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return false;
  const calculated = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(calculated);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  let parsed: ZoomState;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ZoomState;
  } catch {
    return false;
  }
  return parsed.u === expected.userId && parsed.o === expected.organizationId && Number.isFinite(parsed.t) && Date.now() - parsed.t >= 0 && Date.now() - parsed.t <= maxAgeMs;
}

export async function getValidZoomAccessToken(db: any, connection: any) {
  if (!connection?.access_token) throw new Error('Zoom is not connected.');
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (!expiresAt || expiresAt - Date.now() > 60_000) return String(connection.access_token);

  const clientId = String(process.env.ZOOM_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.ZOOM_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret || !connection.refresh_token) throw new Error('Zoom authorization has expired. Reconnect Zoom in Meeting settings.');

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: String(connection.refresh_token) }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || !payload.access_token) throw new Error('Zoom authorization has expired. Reconnect Zoom in Meeting settings.');

  const expires = new Date(Date.now() + Number(payload.expires_in || 3600) * 1000).toISOString();
  await db.from('meeting_connections').update({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || connection.refresh_token,
    token_expires_at: expires,
    scopes: payload.scope || connection.scopes || null,
    status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', connection.id);
  return String(payload.access_token);
}

export async function zoomApi(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as any)?.message || `Zoom request failed (${response.status}).`);
  return payload as any;
}
