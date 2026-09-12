import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { buildBookingSlots, requestedSlotIsValid } from '@/lib/calendar/booking-availability';
import { deliverCalendarInvitations } from '@/lib/calendar/invite-delivery';
import { zoomApiWithRefresh } from '@/lib/calendar/zoom';

export const dynamic = 'force-dynamic';

const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function loadSnapshot(db: any, page: any) {
  const { data: availability, error: availabilityError } = await db
    .from('calendar_availability')
    .select('weekday,start_time,end_time,timezone,is_active')
    .eq('organization_id', page.organization_id)
    .eq('user_id', page.user_id)
    .eq('is_active', true);
  if (availabilityError) throw availabilityError;

  const organizerTimezone = String(availability?.[0]?.timezone || 'UTC');
  const now = new Date();
  const windowEnd = new Date(now.getTime() + Math.max(1, Number(page.booking_window_days || 30)) * 86400000);
  const { data: events, error: eventsError } = await db
    .from('calendar_events')
    .select('starts_at,ends_at,status,show_as')
    .eq('organization_id', page.organization_id)
    .eq('owner_user_id', page.user_id)
    .neq('status', 'cancelled')
    .lt('starts_at', windowEnd.toISOString())
    .gt('ends_at', new Date(now.getTime() - 86400000).toISOString());
  if (eventsError) throw eventsError;

  const slots = buildBookingSlots({
    availability: availability ?? [],
    busy: events ?? [],
    durationMinutes: Number(page.duration_minutes || 30),
    bufferMinutes: Number(page.buffer_minutes || 0),
    minimumNoticeMinutes: Number(page.minimum_notice_minutes || 0),
    bookingWindowDays: Number(page.booking_window_days || 30),
    timeZone: organizerTimezone,
    now,
  });
  return { availability: availability ?? [], organizerTimezone, slots };
}

async function hydrateEvent(db: any, organizationId: string, eventId: string) {
  const { data } = await db
    .from('calendar_events')
    .select('*,calendar_attendees(*)')
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .maybeSingle();
  return data ?? null;
}

async function organizerIdentity(db: any, userId: string) {
  const { data } = await db.from('profiles').select('email,full_name,username').eq('id', userId).maybeSingle();
  return {
    email: String(data?.email || '').trim(),
    name: String(data?.full_name || data?.username || 'Setu Flow').trim(),
  };
}

export async function GET(req: NextRequest) {
  const slug = String(req.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({ error: 'Booking page required.' }, { status: 400 });
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: 'Booking service unavailable.' }, { status: 503 });

  const { data: page } = await db.from('calendar_booking_pages').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
  if (!page) return NextResponse.json({ error: 'Booking page not found.' }, { status: 404 });

  try {
    const snapshot = await loadSnapshot(db, page);
    const identity = await organizerIdentity(db, page.user_id);
    return NextResponse.json({
      page: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        durationMinutes: page.duration_minutes,
        bufferMinutes: page.buffer_minutes,
        minimumNoticeMinutes: page.minimum_notice_minutes,
        bookingWindowDays: page.booking_window_days,
        meetingProvider: page.meeting_provider,
        timezone: snapshot.organizerTimezone,
        organizerName: identity.name,
      },
      slots: snapshot.slots,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Unable to calculate booking availability.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: 'Booking service unavailable.' }, { status: 503 });

  const slug = String(body.slug || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  if (!slug || !name || !emailOk(email)) return NextResponse.json({ error: 'Enter your name and a valid email address.' }, { status: 400 });

  const { data: page } = await db.from('calendar_booking_pages').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
  if (!page) return NextResponse.json({ error: 'Booking page not found.' }, { status: 404 });

  let snapshot: Awaited<ReturnType<typeof loadSnapshot>>;
  try {
    snapshot = await loadSnapshot(db, page);
  } catch {
    return NextResponse.json({ error: 'Unable to verify this time right now.' }, { status: 503 });
  }
  if (!requestedSlotIsValid(snapshot.slots, String(body.startsAt || ''))) {
    return NextResponse.json({ error: 'That time is no longer available. Please choose another.' }, { status: 409 });
  }

  const chosen = snapshot.slots.find(slot => new Date(slot.startsAt).getTime() === new Date(body.startsAt).getTime())!;
  const eventTitle = String(body.title || `Meeting with ${name}`).trim().slice(0, 180);
  const notes = String(body.notes || '').trim().slice(0, 4000);
  const { data: eventId, error: reserveError } = await db.rpc('calendar_book_slot_if_available', {
    p_organization_id: page.organization_id,
    p_user_id: page.user_id,
    p_title: eventTitle,
    p_description: notes || null,
    p_starts_at: chosen.startsAt,
    p_ends_at: chosen.endsAt,
    p_timezone: snapshot.organizerTimezone,
    p_buffer_minutes: Number(page.buffer_minutes || 0),
  });
  if (reserveError) return NextResponse.json({ error: 'Booking safety is not ready. Please try again shortly.' }, { status: 503 });
  if (!eventId) return NextResponse.json({ error: 'That time was just booked. Please choose another.' }, { status: 409 });

  const warnings: string[] = [];
  const attendeeResult = await db.from('calendar_attendees').insert({
    organization_id: page.organization_id,
    event_id: eventId,
    email,
    name: name.slice(0, 160),
    attendee_type: 'required',
    rsvp_status: 'accepted',
    responded_at: new Date().toISOString(),
  });
  if (attendeeResult.error) {
    await db.from('calendar_events').delete().eq('id', eventId).eq('organization_id', page.organization_id);
    return NextResponse.json({ error: 'Unable to save the booking attendee.' }, { status: 500 });
  }
  await db.from('calendar_reminders').insert({ organization_id: page.organization_id, event_id: eventId, channel: 'in_app', minutes_before: 15 });

  let meetingUrl: string | null = null;
  const provider = String(page.meeting_provider || 'none');
  let meetingExternalId: string | null = null;
  let meetingHostUrl: string | null = null;

  if (provider === 'custom') {
    meetingUrl = page.custom_meeting_url || null;
  } else if (provider === 'zoom') {
    const { data: connection } = await db
      .from('meeting_connections')
      .select('*')
      .eq('organization_id', page.organization_id)
      .eq('user_id', page.user_id)
      .eq('provider', 'zoom')
      .eq('status', 'active')
      .maybeSingle();
    if (connection) {
      try {
        const zoom = await zoomApiWithRefresh(db, connection, `/users/${encodeURIComponent(connection.provider_user_id || 'me')}/meetings`, {
          method: 'POST',
          body: JSON.stringify({
            topic: eventTitle,
            type: 2,
            start_time: chosen.startsAt,
            duration: Number(page.duration_minutes || 30),
            timezone: snapshot.organizerTimezone,
            settings: { waiting_room: true, join_before_host: false },
          }),
        });
        meetingUrl = zoom?.join_url || null;
        meetingHostUrl = zoom?.start_url || null;
        meetingExternalId = String(zoom?.id || '') || null;
      } catch (error) {
        warnings.push(error instanceof Error
          ? `The time was booked, but Zoom could not be created: ${error.message}`
          : 'The time was booked, but Zoom could not be created. The organizer needs to add a meeting link.');
      }
    } else {
      warnings.push('The time was booked, but the organizer has not connected Zoom yet.');
    }
  }

  await db.from('calendar_events').update({
    meeting_provider: provider,
    meeting_url: meetingUrl,
    meeting_external_id: meetingExternalId,
    meeting_host_url: meetingHostUrl,
    meeting_metadata: { source: 'public_booking', guest_email: email, guest_name: name, booked_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).eq('id', eventId).eq('organization_id', page.organization_id);

  const event = await hydrateEvent(db, page.organization_id, eventId);
  const identity = await organizerIdentity(db, page.user_id);
  let invitationSent = false;
  if (event && identity.email && !(provider === 'zoom' && !meetingUrl)) {
    try {
      const delivery = await deliverCalendarInvitations({ db, event, organizerEmail: identity.email, organizerName: identity.name, origin: req.nextUrl.origin, action: 'request', force: true });
      invitationSent = delivery.sent > 0;
      if (!delivery.ok) warnings.push(delivery.error || 'The meeting is booked, but one or more calendar invitations could not be delivered automatically.');
    } catch {
      warnings.push('The meeting is booked, but calendar invitation delivery failed unexpectedly.');
    }
  }

  return NextResponse.json({
    ok: true,
    eventId,
    startsAt: chosen.startsAt,
    endsAt: chosen.endsAt,
    organizerTimezone: snapshot.organizerTimezone,
    meetingUrl,
    invitationSent,
    warnings,
  }, { status: 201 });
}
