import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('sprint_issues')
      .select('status,severity,sprint_target')
      .limit(1000);

    if (error || !data) {
      return NextResponse.json({ open: 0, resolved: 0, criticalHigh: 0, milestones: 0 });
    }

    const rows = data as Array<{ status: string | null; severity: string | null; sprint_target: string | null }>;
    const open = rows.filter((row) => row.status === 'Open').length;
    const resolved = rows.filter((row) => row.status === 'Resolved').length;
    const criticalHigh = rows.filter((row) => row.status === 'Open' && ['Critical', 'High'].includes(String(row.severity ?? ''))).length;
    const milestones = new Set(rows.map((row) => row.sprint_target).filter(Boolean)).size;

    return NextResponse.json({ open, resolved, criticalHigh, milestones });
  } catch (error) {
    console.error('[/api/internal/docs-metrics]', error);
    return NextResponse.json({ open: 0, resolved: 0, criticalHigh: 0, milestones: 0 });
  }
}
