import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const PROVIDERS = new Set(['zoom', 'custom', 'none']);
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$/;

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  const db = (await createClient()) as any;
  const { data: grant } = await db.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, db };
}

function defaults(workspace: any) {
  const base = String(workspace.profile?.username || workspace.profile?.full_name || workspace.user?.email?.split('@')[0] || 'calendar')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'calendar';
  return {
    slug: base,
    title: `Schedule time with ${workspace.profile?.full_name || workspace.profile?.username || 'me'}`,
    description: 'Choose an available time that works for you.',
    durationMinutes: 30,
    bufferMinutes: 15,
    minimumNoticeMinutes: 240,
    bookingWindowDays: 30,
    meetingProvider: 'zoom',
    customMeetingUrl: '',
    isActive: true,
  };
}

function serialize(row: any, workspace: any) {
  if (!row) return { id: null, ...defaults(workspace), exists: false };
  return {
    id: row.id,
    exists: true,
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    durationMinutes: row.duration_minutes,
    bufferMinutes: row.buffer_minutes,
    minimumNoticeMinutes: row.minimum_notice_minutes,
    bookingWindowDays: row.booking_window_days,
    meetingProvider: row.meeting_provider,
    customMeetingUrl: row.custom_meeting_url || '',
    isActive: Boolean(row.is_active),
  };
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const { data, error } = await ctx.db.from('calendar_booking_pages').select('*').eq('organization_id', ctx.workspace.organization!.id).eq('user_id', ctx.workspace.user!.id).order('created_at').limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to load booking settings.' }, { status: 500 });
  return NextResponse.json({ bookingPage: serialize(data, ctx.workspace), publicBaseUrl: '/book/' });
}

export async function PUT(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const title = String(body.title || '').trim().slice(0, 180);
  const description = String(body.description || '').trim().slice(0, 1200);
  const durationMinutes = Number(body.durationMinutes);
  const bufferMinutes = Number(body.bufferMinutes);
  const minimumNoticeMinutes = Number(body.minimumNoticeMinutes);
  const bookingWindowDays = Number(body.bookingWindowDays);
  const meetingProvider = PROVIDERS.has(body.meetingProvider) ? body.meetingProvider : 'none';
  const customMeetingUrl = String(body.customMeetingUrl || '').trim().slice(0, 1000);
  const isActive = body.isActive !== false;

  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Booking link must use 3–80 lowercase letters, numbers or hyphens.' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Booking page title is required.' }, { status: 400 });
  if (![15, 20, 30, 45, 60, 90, 120].includes(durationMinutes)) return NextResponse.json({ error: 'Choose a supported meeting duration.' }, { status: 400 });
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) return NextResponse.json({ error: 'Buffer must be between 0 and 120 minutes.' }, { status: 400 });
  if (!Number.isFinite(minimumNoticeMinutes) || minimumNoticeMinutes < 0 || minimumNoticeMinutes > 10080) return NextResponse.json({ error: 'Minimum notice must be between 0 minutes and 7 days.' }, { status: 400 });
  if (!Number.isFinite(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 365) return NextResponse.json({ error: 'Booking window must be between 1 and 365 days.' }, { status: 400 });
  if (meetingProvider === 'custom' && !/^https?:\/\//i.test(customMeetingUrl)) return NextResponse.json({ error: 'Add a valid custom meeting URL.' }, { status: 400 });

  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const { data: existing } = await ctx.db.from('calendar_booking_pages').select('id').eq('organization_id', organizationId).eq('user_id', userId).order('created_at').limit(1).maybeSingle();
  const values = {
    organization_id: organizationId,
    user_id: userId,
    slug,
    title,
    description: description || null,
    duration_minutes: durationMinutes,
    buffer_minutes: Math.round(bufferMinutes),
    minimum_notice_minutes: Math.round(minimumNoticeMinutes),
    booking_window_days: Math.round(bookingWindowDays),
    meeting_provider: meetingProvider,
    custom_meeting_url: meetingProvider === 'custom' ? customMeetingUrl : null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await ctx.db.from('calendar_booking_pages').update(values).eq('id', existing.id).eq('organization_id', organizationId).eq('user_id', userId).select('*').single()
    : await ctx.db.from('calendar_booking_pages').insert(values).select('*').single();

  if (result.error?.code === '23505') return NextResponse.json({ error: 'That booking link is already in use. Choose another.' }, { status: 409 });
  if (result.error || !result.data) return NextResponse.json({ error: 'Unable to save booking settings.' }, { status: 500 });
  return NextResponse.json({ bookingPage: serialize(result.data, ctx.workspace), publicUrl: `${req.nextUrl.origin}/book/${result.data.slug}` });
}
