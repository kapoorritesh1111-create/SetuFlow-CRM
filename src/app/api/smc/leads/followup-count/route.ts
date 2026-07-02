import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ overdue: 0 });
    const { data: m } = await (sb as any).from('organization_members').select('id')
      .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
    if (!m) return NextResponse.json({ overdue: 0 });

    const now = new Date().toISOString();
    const { count } = await (sb as any)
      .from('client_onboarding_requests')
      .select('id', { count: 'exact', head: true })
      .not('next_follow_up_at', 'is', null)
      .lt('next_follow_up_at', now)
      .not('pipeline_stage', 'in', '("converted","lost")');

    return NextResponse.json({ overdue: count ?? 0 });
  } catch {
    return NextResponse.json({ overdue: 0 });
  }
}
