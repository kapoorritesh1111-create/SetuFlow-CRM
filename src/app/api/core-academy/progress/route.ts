import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { CORE_ACADEMY_VERSION } from '@/features/academy/core-academy-content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(request: Request) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: 'Academy storage is unavailable.' }, { status: 503 });

  const form = await request.formData();
  if (clean(form.get('action'), 40) !== 'sync_progress') {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  let entries: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(clean(form.get('progress'), 100000));
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    return NextResponse.json({ error: 'Progress payload is invalid.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows = entries
    .filter((entry) => clean(entry.stepId, 120) && clean(entry.moduleId, 120))
    .map((entry) => ({
      organization_id: workspace.organization!.id,
      user_id: workspace.user!.id,
      membership_id: workspace.membership!.id,
      module_id: clean(entry.moduleId, 120),
      module_title: clean(entry.moduleTitle, 200),
      step_id: clean(entry.stepId, 120),
      step_title: clean(entry.stepTitle, 300),
      route: clean(entry.route, 500),
      screenshot_filename: clean(entry.screenshotFilename, 300),
      academy_version: clean(entry.academyVersion, 80) || CORE_ACADEMY_VERSION,
      is_complete: Boolean(entry.isComplete),
      completed_at: entry.isComplete ? now : null,
      last_seen_at: now,
      updated_at: now,
    }));

  if (!rows.length) return NextResponse.json({ saved: 0 });

  const { error } = await (admin as any)
    .from('core_academy_progress')
    .upsert(rows, { onConflict: 'organization_id,user_id,step_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: rows.length });
}
