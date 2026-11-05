import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: 'Active workspace required' }, { status: 403 });
  }

  // All queries are scoped to the authenticated active organization. The
  // standard client maintains RLS. Never use the service-role client here.
  const db = await createClient();
  const orgId = workspace.organization.id;
  const [leads, quotes, team] = await Promise.all([
    db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    db.from('quotes').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    workspace.canAccessAdmin
      ? db.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true)
      : Promise.resolve(null),
  ]);
  return NextResponse.json({
    organizationId: orgId,
    leads: leads.error ? null : leads.count ?? null,
    quotes: quotes.error ? null : quotes.count ?? null,
    team: !workspace.canAccessAdmin || !team || team.error ? null : team.count ?? null,
    partial: Boolean(leads.error || quotes.error || (team && team.error)),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
