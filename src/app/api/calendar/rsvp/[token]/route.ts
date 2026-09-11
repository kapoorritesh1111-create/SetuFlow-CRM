import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESPONSES = new Set(['accepted', 'tentative', 'declined']);

async function lookup(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const db = createServiceRoleClient() as any;
  if (!db) return null;
  const { data: attendee, error } = await db
    .from('calendar_attendees')
    .select('id,email,name,attendee_type,rsvp_status,responded_at,response_token,event_id,organization_id,calendar_events(id,title,description,location,starts_at,ends_at,timezone,is_all_day,status,meeting_provider,meeting_url)')
    .eq('response_token', token)
    .maybeSingle();
  if (error || !attendee) return null;
  return { db, attendee };
}

export async function GET(_req: NextRequest, context: { params: { token: string } }) {
  const found = await lookup(String(context.params.token || '').trim());
  if (!found) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  const event = Array.isArray(found.attendee.calendar_events) ? found.attendee.calendar_events[0] : found.attendee.calendar_events;
  if (!event) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  return NextResponse.json({
    attendee: {
      email: found.attendee.email,
      name: found.attendee.name,
      attendeeType: found.attendee.attendee_type,
      response: found.attendee.rsvp_status,
      respondedAt: found.attendee.responded_at,
    },
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      timezone: event.timezone,
      isAllDay: event.is_all_day,
      status: event.status,
      meetingProvider: event.meeting_provider,
      meetingUrl: event.status === 'cancelled' ? null : event.meeting_url,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest, context: { params: { token: string } }) {
  const token = String(context.params.token || '').trim();
  const found = await lookup(token);
  if (!found) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  const event = Array.isArray(found.attendee.calendar_events) ? found.attendee.calendar_events[0] : found.attendee.calendar_events;
  if (!event) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  if (event.status === 'cancelled') return NextResponse.json({ error: 'This meeting has been cancelled.' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const response = String(body.response || '').trim().toLowerCase();
  if (!RESPONSES.has(response)) return NextResponse.json({ error: 'Choose Accept, Tentative or Decline.' }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await found.db
    .from('calendar_attendees')
    .update({ rsvp_status: response, responded_at: now, responded_via: 'setu_link' })
    .eq('id', found.attendee.id)
    .eq('response_token', token)
    .select('rsvp_status,responded_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Unable to save your response.' }, { status: 500 });

  return NextResponse.json({ ok: true, response: data.rsvp_status, respondedAt: data.responded_at });
}
