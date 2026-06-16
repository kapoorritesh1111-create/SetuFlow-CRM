import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Parallel queries for dashboard stats
    const [issuesRes, leadsRes, orgsRes, incidentsRes] = await Promise.all([
      supabase.from('sprint_issues').select('status', { count: 'exact', head: false }),
      supabase.from('client_onboarding_requests').select('id, pipeline_stage', { count: 'exact' }),
      supabase.from('organizations').select('id', { count: 'exact' }),
      supabase.from('smc_incidents').select('id, status', { count: 'exact' }),
    ]);

    const issues = issuesRes.data ?? [];
    const openIssues = issues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length;
    const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;
    const blockedIssues = issues.filter(i => i.status === 'Blocked' || i.status === 'blocked').length;

    const leads = leadsRes.data ?? [];
    const activeIncidents = (incidentsRes.data ?? []).filter(i => i.status !== 'resolved').length;

    return NextResponse.json({
      issues: { total: issues.length, open: openIssues, resolved: resolvedIssues, blocked: blockedIssues },
      leads: { total: leads.length },
      clients: { total: orgsRes.count ?? 0 },
      incidents: { active: activeIncidents },
    });
  } catch (err) {
    console.error('SMC stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
