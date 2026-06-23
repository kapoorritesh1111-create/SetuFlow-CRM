import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendWebPushToUsers } from '@/lib/notifications/web-push';

export const dynamic = 'force-dynamic';

// POST /api/push/test — sends a test push to the signed-in user's subscribed devices.
// Returns { sent, pruned } (or { skipped: 'vapid-not-configured' } until env keys are set).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = (createAdminSupabaseClient() ?? supabase) as unknown as { from: (table: string) => unknown };
  const result = await sendWebPushToUsers(admin, [user.id], {
    title: 'SMC test alert',
    body: 'Push notifications are working on this device.',
    action_url: '/smc',
    priority: 'normal',
    type: 'system_test',
  });
  return NextResponse.json(result);
}
