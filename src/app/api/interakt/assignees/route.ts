import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager']);
const TERMINAL = ['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored'];

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export async function GET() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || clean(organization?.slug).toLowerCase() === STARK_PACKMATE_SLUG;
  if (!workspace.user || !workspace.membership || !organization || !isStark) {
    return NextResponse.json({ error: 'Stark Packmate workspace required.' }, { status: 403 });
  }

  const roles = workspace.currentRoles.map((role) => clean(role).toLowerCase());
  const canFilterOwners = Boolean(workspace.canAccessAdmin) || roles.some((role) => MANAGEMENT_ROLES.has(role));
  if (!canFilterOwners) return NextResponse.json({ canFilterOwners: false, assignees: [] });

  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ error: 'Assignee lookup unavailable.' }, { status: 503 });

  const { data, error } = await db
    .from('lead_intake_staging')
    .select('setu_assigned_name,setu_assigned_email,interakt_assignee_name')
    .eq('organization_id', organization.id)
    .eq('source_provider', 'interakt')
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`)
    .or('setu_assigned_name.not.is.null,setu_assigned_email.not.is.null,interakt_assignee_name.not.is.null')
    .limit(1000);

  if (error) return NextResponse.json({ error: 'Unable to load assigned users.' }, { status: 500 });

  const unique = new Map<string, { value: string; label: string; email: string | null }>();
  for (const row of data ?? []) {
    const name = clean(row.setu_assigned_name) || clean(row.interakt_assignee_name);
    const email = clean(row.setu_assigned_email);
    const value = name || email;
    if (!value) continue;
    const key = `${name.toLowerCase()}|${email.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, { value, label: name || email, email: email || null });
  }

  const assignees = [...unique.values()].sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json({ canFilterOwners: true, assignees });
}
