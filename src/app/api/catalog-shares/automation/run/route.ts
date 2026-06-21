import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { evaluateCatalogEngagementAutomation } from '@/lib/catalog-share/engagement-automation';

export const dynamic = 'force-dynamic';

// POST /api/catalog-shares/automation/run
// Authenticated internal runner for catalog engagement notifications.
// Safe/additive: evaluates recent active shares and writes deduped in-app notifications only.
export async function POST() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });

  const sb = (await createClient()) as any;
  const { data: shares, error } = await sb
    .from('catalog_shares')
    .select('id')
    .eq('organization_id', ws.organization.id)
    .in('status', ['active', 'expired'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let evaluated = 0;
  let created = 0;
  for (const share of (shares ?? []) as Array<{ id: string }>) {
    const result = await evaluateCatalogEngagementAutomation({ svc: sb, shareId: share.id }).catch(() => null);
    if (result?.ok) {
      evaluated += 1;
      created += Number(result.created ?? 0);
    }
  }

  return NextResponse.json({ ok: true, evaluated, notifications_created: created });
}
