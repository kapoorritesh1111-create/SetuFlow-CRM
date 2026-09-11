import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

type AvailabilityRow = {
  weekday: number;
  startTime: string;
  endTime: string;
};

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, supabase };
}

function validRow(row: AvailabilityRow) {
  return Number.isInteger(row.weekday)
    && row.weekday >= 0
    && row.weekday <= 6
    && TIME_RE.test(row.startTime)
    && TIME_RE.test(row.endTime)
    && row.endTime > row.startTime;
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const { data, error } = await ctx.supabase
    .from('calendar_availability')
    .select('weekday,start_time,end_time,timezone,is_active')
    .eq('organization_id', ctx.workspace.organization!.id)
    .eq('user_id', ctx.workspace.user!.id)
    .eq('is_active', true)
    .order('weekday');
  if (error) return NextResponse.json({ error: 'Unable to load working hours.' }, { status: 500 });
  return NextResponse.json({ availability: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => null) as { timezone?: string; days?: AvailabilityRow[] } | null;
  const timezone = String(body?.timezone ?? '').trim().slice(0, 80) || 'UTC';
  const days = Array.isArray(body?.days) ? body!.days : [];
  if (days.length > 7 || days.some(row => !validRow(row))) return NextResponse.json({ error: 'Choose valid work days and working hours.' }, { status: 400 });
  if (new Set(days.map(row => row.weekday)).size !== days.length) return NextResponse.json({ error: 'Each work day can only be configured once.' }, { status: 400 });

  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const { error: deleteError } = await ctx.supabase
    .from('calendar_availability')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  if (deleteError) return NextResponse.json({ error: 'Unable to update working hours.' }, { status: 500 });

  if (days.length) {
    const now = new Date().toISOString();
    const rows = days.map(row => ({
      organization_id: organizationId,
      user_id: userId,
      weekday: row.weekday,
      start_time: row.startTime,
      end_time: row.endTime,
      timezone,
      is_active: true,
      updated_at: now,
    }));
    const { error } = await ctx.supabase.from('calendar_availability').insert(rows);
    if (error) return NextResponse.json({ error: 'Unable to save working hours.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
