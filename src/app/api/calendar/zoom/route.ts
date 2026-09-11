import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { getValidZoomAccessToken, zoomApi } from '@/lib/calendar/zoom';

export const dynamic = 'force-dynamic';

async function access() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return null;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;
  const db = (await createClient()) as any;
  const { data: connection } = await db.from('meeting_connections').select('*').eq('organization_id', organizationId).eq('user_id', userId).eq('provider', 'zoom').eq('status', 'active').maybeSingle();
  return { organizationId, userId, db, connection };
}

async function eventFor(ctx: NonNullable<Awaited<ReturnType<typeof access>>>, eventId: string) {
  const { data } = await ctx.db.from('calendar_events').select('*').eq('id', eventId).eq('organization_id', ctx.organizationId).single();
  return data;
}

function zoomMeetingBody(event: any) {
  const duration = Math.max(1, Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000));
  return { topic: event.title, type: 2, start_time: event.starts_at, duration, timezone: event.timezone || 'UTC', agenda: event.description || '', settings: { join_before_host: false, waiting_room: true } };
}

export async function POST(req: NextRequest) {
  const ctx = await access();
  if (!ctx) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!ctx.connection) return NextResponse.json({ error: 'Connect Zoom in meeting settings first.' }, { status: 409 });
  const { eventId } = await req.json();
  const event = await eventFor(ctx, String(eventId || ''));
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  if (event.meeting_external_id && event.meeting_provider === 'zoom') return NextResponse.json({ joinUrl: event.meeting_url, meetingId: event.meeting_external_id });
  try {
    const token = await getValidZoomAccessToken(ctx.db, ctx.connection);
    const meeting = await zoomApi(token, '/users/me/meetings', { method: 'POST', body: JSON.stringify(zoomMeetingBody(event)) });
    const { error } = await ctx.db.from('calendar_events').update({ meeting_provider: 'zoom', meeting_url: meeting.join_url, meeting_host_url: meeting.start_url, meeting_external_id: String(meeting.id), meeting_password: meeting.password || null, meeting_metadata: { provider: 'zoom' }, updated_at: new Date().toISOString() }).eq('id', event.id).eq('organization_id', ctx.organizationId);
    if (error) throw new Error('Unable to save Zoom meeting.');
    return NextResponse.json({ joinUrl: meeting.join_url, meetingId: String(meeting.id) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Zoom could not create this meeting.' }, { status: 502 }); }
}

export async function PATCH(req: NextRequest) {
  const ctx = await access();
  if (!ctx || !ctx.connection) return NextResponse.json({ error: 'Zoom is not connected.' }, { status: ctx ? 409 : 401 });
  const { eventId } = await req.json();
  const event = await eventFor(ctx, String(eventId || ''));
  if (!event?.meeting_external_id || event.meeting_provider !== 'zoom') return NextResponse.json({ error: 'Zoom meeting not found.' }, { status: 404 });
  try {
    const token = await getValidZoomAccessToken(ctx.db, ctx.connection);
    await zoomApi(token, `/meetings/${encodeURIComponent(event.meeting_external_id)}`, { method: 'PATCH', body: JSON.stringify(zoomMeetingBody(event)) });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update Zoom meeting.' }, { status: 502 }); }
}

export async function DELETE(req: NextRequest) {
  const ctx = await access();
  if (!ctx || !ctx.connection) return NextResponse.json({ error: 'Zoom is not connected.' }, { status: ctx ? 409 : 401 });
  const eventId = req.nextUrl.searchParams.get('eventId') || '';
  const event = await eventFor(ctx, eventId);
  if (!event?.meeting_external_id || event.meeting_provider !== 'zoom') return NextResponse.json({ error: 'Zoom meeting not found.' }, { status: 404 });
  try {
    const token = await getValidZoomAccessToken(ctx.db, ctx.connection);
    await zoomApi(token, `/meetings/${encodeURIComponent(event.meeting_external_id)}`, { method: 'DELETE' });
    await ctx.db.from('calendar_events').update({ meeting_provider: 'none', meeting_url: null, meeting_host_url: null, meeting_external_id: null, meeting_password: null, meeting_metadata: {}, updated_at: new Date().toISOString() }).eq('id', event.id).eq('organization_id', ctx.organizationId);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to cancel Zoom meeting.' }, { status: 502 }); }
}
