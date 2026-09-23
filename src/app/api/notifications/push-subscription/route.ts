import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  organizationId?: string;
  userId?: string;
  endpoint?: string;
  authKey?: string;
  p256dh?: string;
  userAgent?: string | null;
  appScope?: 'crm' | 'setu-mail';
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const organizationId = String(body.organizationId ?? '').trim();
    const requestedUserId = String(body.userId ?? '').trim();
    const endpoint = String(body.endpoint ?? '').trim();
    const authKey = String(body.authKey ?? '').trim();
    const p256dh = String(body.p256dh ?? '').trim();
    const appScope = body.appScope === 'setu-mail' ? 'setu-mail' : 'crm';

    if (!organizationId || !endpoint || !authKey || !p256dh) {
      return NextResponse.json({ ok: false, error: 'Missing push subscription fields.' }, { status: 400 });
    }

    const server = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    if (requestedUserId && requestedUserId !== user.id) return NextResponse.json({ ok: false, error: 'User mismatch.' }, { status: 403 });

    const admin = createAdminSupabaseClient();
    if (!admin) return NextResponse.json({ ok: false, error: 'Push service unavailable.' }, { status: 503 });

    const { data: member, error: memberError } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (memberError || !member?.id) return NextResponse.json({ ok: false, error: 'Workspace membership required.' }, { status: 403 });

    const now = new Date().toISOString();
    const { data: existing } = await admin.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle();
    const values = {
      organization_id: organizationId,
      user_id: user.id,
      endpoint,
      auth_key: authKey,
      p256dh,
      user_agent: body.userAgent ?? null,
      app_scope: appScope,
      last_seen_at: now,
    };

    const result = existing?.id
      ? await admin.from('push_subscriptions').update(values).eq('id', existing.id)
      : await admin.from('push_subscriptions').insert(values);

    if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, appScope });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to register push notifications.' }, { status: 500 });
  }
}
