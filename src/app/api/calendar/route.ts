import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { deliverCalendarInvitations } from '@/lib/calendar/invite-delivery';
import {
  cancelZoomMeetingForEvent,
  createZoomMeetingForEvent,
  getZoomConnection,
  updateZoomMeetingForEvent,
} from '@/lib/calendar/zoom-lifecycle';

export const dynamic = 'force-dynamic';

const PROVIDERS = new Set(['zoom', 'custom', 'in_person', 'none']);
const RSVP = new Set(['needs_action', 'accepted', 'tentative', 'declined']);
const SHOW_AS = new Set(['busy', 'free', 'tentative', 'out_of_office', 'working_elsewhere']);
const VISIBILITY = new Set(['organization', 'private']);
const ENTITY_TYPES = new Set(['lead', 'quote', 'order', 'task', 'mail_thread', 'trade_event']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LifecycleWarning = { area: 'zoom' | 'invitation'; message: string };

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, supabase };
}

function dates(body: any) {
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  return { startsAt, endsAt, valid: !Number.isNaN(startsAt.valueOf()) && !Number.isNaN(endsAt.valueOf()) && endsAt > startsAt };
}

function organizer(workspace: any) {
  return {
    email: String(workspace.profile?.email ?? workspace.user?.email ?? '').trim(),
    name: String(workspace.profile?.full_name ?? workspace.profile?.username ?? 'Setu Flow').trim(),
  };
}

function normalizeAttendees(body: any) {
  if (!Array.isArray(body.attendees)) return null;
  const map = new Map<string, any>();
  for (const attendee of body.attendees) {
    const email = String(attendee?.email ?? attendee ?? '').trim().toLowerCase();
    if (!email.includes('@')) continue;
    map.set(email, {
      email,
      name: attendee?.name ? String(attendee.name).slice(0, 160) : null,
      attendee_type: attendee.attendeeType === 'optional' ? 'optional' : 'required',
      requested_rsvp_status: RSVP.has(attendee?.rsvpStatus) ? attendee.rsvpStatus : null,
    });
  }
  return [...map.values()];
}

async function conflict(db: any, organizationId: string, userId: string, start: string, end: string, excludeId?: string, showAs = 'busy') {
  if (showAs === 'free') return null;
  let query = db.from('calendar_events').select('id,title,starts_at,ends_at,show_as').eq('organization_id', organizationId).eq('owner_user_id', userId).neq('status', 'cancelled').neq('show_as', 'free').lt('starts_at', end).gt('ends_at', start).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query;
  return data?.[0] ?? null;
}

async function hydrateEvent(db: any, organizationId: string, eventId: string) {
  const { data } = await db.from('calendar_events').select('*,calendar_attendees(*),calendar_reminders(*),calendar_event_links(*)').eq('organization_id', organizationId).eq('id', eventId).maybeSingle();
  return data ?? null;
}

async function syncAttendees(db: any, organizationId: string, eventId: string, incoming: ReturnType<typeof normalizeAttendees>) {
  if (!incoming) return;
  const { data: existing, error: readError } = await db.from('calendar_attendees').select('*').eq('event_id', eventId).eq('organization_id', organizationId);
  if (readError) throw readError;
  const existingByEmail = new Map<string, any>((existing ?? []).map((row: any) => [String(row.email).toLowerCase(), row]));
  const incomingEmails = incoming.map(row => row.email);
  const removedIds = (existing ?? []).filter((row: any) => !incomingEmails.includes(String(row.email).toLowerCase())).map((row: any) => row.id);
  if (removedIds.length) {
    const { error } = await db.from('calendar_attendees').delete().eq('organization_id', organizationId).eq('event_id', eventId).in('id', removedIds);
    if (error) throw error;
  }
  if (!incoming.length) return;
  const rows = incoming.map(row => {
    const current = existingByEmail.get(row.email);
    return {
      organization_id: organizationId,
      event_id: eventId,
      email: row.email,
      name: row.name,
      attendee_type: row.attendee_type,
      rsvp_status: current?.rsvp_status ?? row.requested_rsvp_status ?? 'needs_action',
    };
  });
  const { error } = await db.from('calendar_attendees').upsert(rows, { onConflict: 'event_id,email' });
  if (error) throw error;
}

async function syncChildren(db: any, organizationId: string, eventId: string, body: any) {
  await syncAttendees(db, organizationId, eventId, normalizeAttendees(body));

  if (body.reminderMinutes !== undefined) {
    const minutes = Number(body.reminderMinutes);
    if (Number.isFinite(minutes) && minutes >= 0 && minutes <= 10080) {
      const { error: deleteError } = await db.from('calendar_reminders').delete().eq('event_id', eventId).eq('organization_id', organizationId);
      if (deleteError) throw deleteError;
      const channels = Array.isArray(body.reminderChannels) && body.reminderChannels.length ? body.reminderChannels : ['in_app'];
      const rows = [...new Set(channels)]
        .filter((channel): channel is string => channel === 'in_app' || channel === 'email')
        .map(channel => ({ organization_id: organizationId, event_id: eventId, channel, minutes_before: minutes }));
      if (rows.length) {
        const { error } = await db.from('calendar_reminders').insert(rows);
        if (error) throw error;
      }
    }
  }

  if (Array.isArray(body.links)) {
    const { error: deleteError } = await db.from('calendar_event_links').delete().eq('event_id', eventId).eq('organization_id', organizationId);
    if (deleteError) throw deleteError;
    const links = body.links
      .map((link: any) => ({ organization_id: organizationId, event_id: eventId, entity_type: String(link.entityType || link.entity_type || ''), entity_id: String(link.entityId || link.entity_id || ''), label: link.label ? String(link.label).slice(0, 160) : null }))
      .filter((link: any) => ENTITY_TYPES.has(link.entity_type) && UUID_RE.test(link.entity_id));
    if (links.length) {
      const { error } = await db.from('calendar_event_links').upsert(links, { onConflict: 'event_id,entity_type,entity_id' });
      if (error) throw error;
    }
  }
}

async function sendInvites(db: any, workspace: any, event: any, origin: string, action: 'request' | 'update' | 'cancel', warnings: LifecycleWarning[]) {
  if (!event?.calendar_attendees?.length) return;
  const identity = organizer(workspace);
  if (!identity.email) {
    warnings.push({ area: 'invitation', message: 'Organizer email is unavailable, so invitations were not sent.' });
    return;
  }
  const result = await deliverCalendarInvitations({ db, event, organizerEmail: identity.email, organizerName: identity.name, origin, action });
  if (!result.ok) warnings.push({ area: 'invitation', message: result.error || `${result.failed} invitation(s) could not be delivered.` });
}

export async function GET(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const organizationId = ctx.workspace.organization!.id;
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === '1';
  let query = ctx.supabase.from('calendar_events').select('*,calendar_attendees(*),calendar_reminders(*),calendar_event_links(*)').eq('organization_id', organizationId).order('starts_at');
  if (!includeCancelled) query = query.neq('status', 'cancelled');
  if (from) query = query.gte('starts_at', from);
  if (to) query = query.lt('starts_at', to);
  const { data, error } = await query.limit(500);
  return error ? NextResponse.json({ error: 'Unable to load calendar.' }, { status: 500 }) : NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const validDates = dates(body);
  if (!title || !validDates.valid) return NextResponse.json({ error: 'Add a title and valid start/end time.' }, { status: 400 });

  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const provider = PROVIDERS.has(body.meetingProvider) ? body.meetingProvider : 'none';
  const showAs = SHOW_AS.has(body.showAs) ? body.showAs : 'busy';
  const visibility = VISIBILITY.has(body.visibility) ? body.visibility : 'organization';
  const hit = await conflict(ctx.supabase, organizationId, userId, validDates.startsAt.toISOString(), validDates.endsAt.toISOString(), undefined, showAs);
  if (hit && !body.allowConflict) return NextResponse.json({ error: 'This time overlaps another calendar event.', conflict: hit }, { status: 409 });
  if (provider === 'zoom') {
    const connection = await getZoomConnection(ctx.supabase, organizationId, userId);
    if (!connection) return NextResponse.json({ error: 'Connect Zoom in Calendar settings or choose another meeting type.' }, { status: 409 });
  }

  const { data: event, error } = await ctx.supabase.from('calendar_events').insert({
    organization_id: organizationId,
    owner_user_id: userId,
    created_by: userId,
    title,
    description: body.description || null,
    location: body.location || null,
    starts_at: validDates.startsAt.toISOString(),
    ends_at: validDates.endsAt.toISOString(),
    timezone: body.timezone || 'UTC',
    is_all_day: Boolean(body.isAllDay),
    visibility,
    show_as: showAs,
    recurrence_rule: body.recurrenceRule ? String(body.recurrenceRule).slice(0, 500) : null,
    meeting_provider: provider,
    meeting_url: provider === 'custom' ? body.meetingUrl || null : null,
    ics_sequence: 0,
  }).select('*').single();
  if (error || !event) return NextResponse.json({ error: 'Unable to create event.' }, { status: 500 });

  try {
    await syncChildren(ctx.supabase, organizationId, event.id, body);
  } catch {
    await ctx.supabase.from('calendar_events').delete().eq('id', event.id).eq('organization_id', organizationId);
    return NextResponse.json({ error: 'Unable to save event attendees or reminders.' }, { status: 500 });
  }

  const warnings: LifecycleWarning[] = [];
  let hydrated = await hydrateEvent(ctx.supabase, organizationId, event.id);
  if (provider === 'zoom' && hydrated) {
    const zoom = await createZoomMeetingForEvent(ctx.supabase, organizationId, userId, hydrated);
    if (!zoom.ok) warnings.push({ area: 'zoom', message: zoom.error || 'Zoom meeting could not be created.' });
    hydrated = await hydrateEvent(ctx.supabase, organizationId, event.id);
  }
  if (hydrated && !(provider === 'zoom' && !hydrated.meeting_url)) await sendInvites(ctx.supabase, ctx.workspace, hydrated, req.nextUrl.origin, 'request', warnings);
  return NextResponse.json({ event: hydrated ?? event, warnings }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });

  const organizationId = ctx.workspace.organization!.id;
  const { data: existing } = await ctx.supabase.from('calendar_events').select('*,calendar_attendees(*)').eq('id', id).eq('organization_id', organizationId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  if (existing.status === 'cancelled') return NextResponse.json({ error: 'Cancelled events cannot be edited.' }, { status: 409 });

  const start = new Date(body.startsAt ?? existing.starts_at);
  const end = new Date(body.endsAt ?? existing.ends_at);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) return NextResponse.json({ error: 'Add a valid start/end time.' }, { status: 400 });
  const showAs = SHOW_AS.has(body.showAs) ? body.showAs : existing.show_as || 'busy';
  const hit = await conflict(ctx.supabase, organizationId, existing.owner_user_id, start.toISOString(), end.toISOString(), id, showAs);
  if (hit && !body.allowConflict) return NextResponse.json({ error: 'This time overlaps another calendar event.', conflict: hit }, { status: 409 });

  const targetProvider = body.meetingProvider !== undefined && PROVIDERS.has(body.meetingProvider) ? body.meetingProvider : existing.meeting_provider;
  if (targetProvider === 'zoom') {
    const connection = await getZoomConnection(ctx.supabase, organizationId, existing.owner_user_id);
    if (!connection) return NextResponse.json({ error: 'Reconnect Zoom before saving changes to this Zoom meeting.' }, { status: 409 });
  }

  const warnings: LifecycleWarning[] = [];
  const incoming = normalizeAttendees(body);
  if (incoming) {
    const incomingEmails = new Set(incoming.map(row => row.email));
    const removed = (existing.calendar_attendees ?? []).filter((row: any) => !incomingEmails.has(String(row.email).toLowerCase()));
    if (removed.length) {
      await sendInvites(ctx.supabase, ctx.workspace, { ...existing, calendar_attendees: removed, ics_sequence: Number(existing.ics_sequence ?? 0) + 1 }, req.nextUrl.origin, 'cancel', warnings);
    }
  }

  if (existing.meeting_provider === 'zoom' && targetProvider !== 'zoom' && existing.meeting_external_id) {
    const zoomCancel = await cancelZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, existing);
    if (!zoomCancel.ok) return NextResponse.json({ error: zoomCancel.error || 'Unable to remove the existing Zoom meeting.' }, { status: 502 });
  }

  const patch: any = {
    updated_at: new Date().toISOString(),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    ics_sequence: Number(existing.ics_sequence ?? 0) + 1,
  };
  const fields = {
    title: body.title !== undefined ? String(body.title).trim() : undefined,
    description: body.description !== undefined ? body.description || null : undefined,
    location: body.location !== undefined ? body.location || null : undefined,
    timezone: body.timezone,
    is_all_day: body.isAllDay,
    status: body.status,
    visibility: body.visibility !== undefined && VISIBILITY.has(body.visibility) ? body.visibility : undefined,
    show_as: body.showAs !== undefined && SHOW_AS.has(body.showAs) ? body.showAs : undefined,
    recurrence_rule: body.recurrenceRule !== undefined ? (body.recurrenceRule ? String(body.recurrenceRule).slice(0, 500) : null) : undefined,
    meeting_provider: targetProvider,
    meeting_url: body.meetingUrl !== undefined ? body.meetingUrl || null : targetProvider === 'custom' ? existing.meeting_url : targetProvider === 'zoom' ? existing.meeting_url : null,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) patch[key] = value;
  if (existing.meeting_provider === 'zoom' && targetProvider !== 'zoom') {
    patch.meeting_external_id = null;
    patch.meeting_host_url = null;
    patch.meeting_password = null;
    patch.meeting_metadata = {};
  }

  const { data: updated, error } = await ctx.supabase.from('calendar_events').update(patch).eq('id', id).eq('organization_id', organizationId).select('*').single();
  if (error || !updated) return NextResponse.json({ error: 'Unable to update event.' }, { status: 500 });
  try {
    await syncChildren(ctx.supabase, organizationId, id, body);
  } catch {
    return NextResponse.json({ error: 'Event was updated, but attendees or reminders could not be synchronized.' }, { status: 500 });
  }

  let hydrated = await hydrateEvent(ctx.supabase, organizationId, id);
  if (targetProvider === 'zoom' && hydrated) {
    const zoom = existing.meeting_provider === 'zoom' && existing.meeting_external_id
      ? await updateZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, hydrated)
      : await createZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, hydrated);
    if (!zoom.ok) warnings.push({ area: 'zoom', message: zoom.error || 'Zoom meeting could not be synchronized.' });
    hydrated = await hydrateEvent(ctx.supabase, organizationId, id);
  }
  if (hydrated && !(targetProvider === 'zoom' && !hydrated.meeting_url)) await sendInvites(ctx.supabase, ctx.workspace, hydrated, req.nextUrl.origin, 'update', warnings);
  return NextResponse.json({ event: hydrated ?? updated, warnings });
}

export async function DELETE(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const id = String(req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });

  const organizationId = ctx.workspace.organization!.id;
  const existing = await hydrateEvent(ctx.supabase, organizationId, id);
  if (!existing) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  if (existing.status === 'cancelled') return NextResponse.json({ ok: true, cancelled: true, warnings: [] });

  const now = new Date().toISOString();
  const { data: cancelled, error } = await ctx.supabase.from('calendar_events').update({
    status: 'cancelled',
    cancelled_at: now,
    ics_sequence: Number(existing.ics_sequence ?? 0) + 1,
    updated_at: now,
  }).eq('id', id).eq('organization_id', organizationId).select('*').single();
  if (error || !cancelled) return NextResponse.json({ error: 'Unable to cancel event.' }, { status: 500 });

  const warnings: LifecycleWarning[] = [];
  const hydrated = await hydrateEvent(ctx.supabase, organizationId, id);
  if (hydrated) await sendInvites(ctx.supabase, ctx.workspace, hydrated, req.nextUrl.origin, 'cancel', warnings);
  if (existing.meeting_external_id) {
    const zoom = await cancelZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, existing);
    if (!zoom.ok) warnings.push({ area: 'zoom', message: zoom.error || 'Setu cancelled the event, but the remote Zoom meeting still needs attention.' });
  }
  return NextResponse.json({ ok: true, cancelled: true, warnings });
}
