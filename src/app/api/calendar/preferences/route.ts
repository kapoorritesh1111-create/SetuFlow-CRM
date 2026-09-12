import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { isValidTimeZone } from '@/lib/calendar/recurrence';

export const dynamic = 'force-dynamic';
const CHANNELS = new Set(['in_app', 'email']);

async function context() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  const db = (await createClient()) as any;
  const { data: grant } = await db.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  return { workspace, db, communicationsEnabled: Boolean(grant?.enabled) };
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const [{ data: preference }, { data: availability }] = await Promise.all([
    ctx.db.from('calendar_preferences').select('timezone,default_reminder_minutes,default_reminder_channels').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
    ctx.db.from('calendar_availability').select('timezone').eq('organization_id', organizationId).eq('user_id', userId).eq('is_active', true).limit(1),
  ]);
  const fallbackZone = String(availability?.[0]?.timezone || 'UTC');
  return NextResponse.json({
    preferences: {
      timezone: preference?.timezone || fallbackZone,
      defaultReminderMinutes: Number(preference?.default_reminder_minutes ?? 15),
      defaultReminderChannels: Array.isArray(preference?.default_reminder_channels) && preference.default_reminder_channels.length ? preference.default_reminder_channels : ['in_app'],
    },
    communications: {
      enabled: ctx.communicationsEnabled,
      canManage: Boolean(ctx.workspace.canAccessAdmin),
      adminUrl: '/admin/mail',
    },
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  if (!ctx.communicationsEnabled) return NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const timezone = String(body.timezone || '').trim();
  const minutes = Number(body.defaultReminderMinutes);
  const channels = Array.isArray(body.defaultReminderChannels)
    ? [...new Set(body.defaultReminderChannels.map((value: unknown) => String(value)).filter((value: string) => CHANNELS.has(value)))]
    : ['in_app'];
  if (!isValidTimeZone(timezone)) return NextResponse.json({ error: 'Choose a valid IANA time zone.' }, { status: 400 });
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080) return NextResponse.json({ error: 'Default reminder must be between 0 minutes and 7 days.' }, { status: 400 });
  if (!channels.length) return NextResponse.json({ error: 'Choose at least one reminder channel.' }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await ctx.db.from('calendar_preferences').upsert({
    organization_id: ctx.workspace.organization!.id,
    user_id: ctx.workspace.user!.id,
    timezone,
    default_reminder_minutes: minutes,
    default_reminder_channels: channels,
    updated_at: now,
  }, { onConflict: 'organization_id,user_id' }).select('timezone,default_reminder_minutes,default_reminder_channels').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to save Calendar preferences.' }, { status: 500 });
  return NextResponse.json({
    ok: true,
    preferences: {
      timezone: data.timezone,
      defaultReminderMinutes: data.default_reminder_minutes,
      defaultReminderChannels: data.default_reminder_channels,
    },
  });
}
