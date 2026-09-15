import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { loadRequiredProfileSignature } from '@/lib/messaging/profile-signature';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ error: 'Sender profile unavailable.' }, { status: 503 });

  const signature = await loadRequiredProfileSignature(db, {
    userId: workspace.user.id,
    organizationId: workspace.organization.id,
    fallbackName: workspace.profile?.full_name ?? workspace.user.email,
    fallbackEmail: workspace.profile?.email ?? workspace.user.email,
    fallbackOrganizationName: workspace.organization.name,
  });

  return NextResponse.json({ signature });
}
