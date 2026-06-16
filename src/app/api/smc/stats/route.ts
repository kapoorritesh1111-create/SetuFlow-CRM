import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type StatusRow = { status: string };
type IdRow = { id: string };
type LeadRow = { id: string; pipeline_stage: string | null };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [issuesRes, leadsRes, orgsRes] = await Promise.all([
      supabase.from('sprint_issues').select('status'),
      supabase.from('client_onboarding_requests').select('*'),
      supabase.from('organizations').select('id'),
    ]);

    // smc_incidents may not be in generated types yet, query with any cast
    let activeIncidents = 0;
    try {
      const { data: incData } = await (supabase as any).from('smc_incidents').select('id, status');
      activeIncidents = (incData ?? []).filter((i: any) => i.status !== 'resolved').length;
    } catch { /* table may not exist in types */ }

    const issues = (issuesRes.data as StatusRow[]) ?? [];
    const leads = (leadsRes.data as LeadRow[]) ?? [];

    return NextResponse.json({
      issues: {
        total: issues.length,
        open: issues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length,
        resolved: issues.filter(i => i.status === 'Resolved').length,
        blocked: issues.filter(i => i.status === 'Blocked' || i.status === 'blocked').length,
      },
      leads: { total: leads.length },
      clients: { total: (orgsRes.data as IdRow[] | null)?.length ?? 0 },
      incidents: { active: activeIncidents },
    });
  } catch (err) {
    console.error('SMC stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
