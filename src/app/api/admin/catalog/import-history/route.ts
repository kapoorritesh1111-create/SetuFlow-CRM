import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Your current role cannot review catalog import history.' }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('import_runs')
    .select('id, import_type, source_file_name, status, started_at, completed_at, rows_read, rows_valid, rows_warning, rows_blocked, rows_inserted, rows_updated, summary_payload, import_issues(id, source_row_no, field_name, severity, issue_code, issue_message, blocking_flag)')
    .eq('organization_id', workspace.organization.id)
    .order('started_at', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ importRuns: data ?? [] });
}
