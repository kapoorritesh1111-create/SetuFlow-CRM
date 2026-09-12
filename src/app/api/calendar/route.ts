import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { deliverCalendarInvitations } from '@/lib/calendar/invite-delivery';
import {
  expandRecurringEvent,
  isValidTimeZone,
  localDateTimeToUtc,
  normalizeRecurrenceRule,
  parseRecurrenceOccurrenceId,
  recurrenceOccurrenceId,
} from '@/lib/calendar/recurrence';
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
const SERIES_CONFLICT_DAYS = 730;

type LifecycleWarning = { area: 'zoom' | 'invitation'; message: string };

type CalendarPreference = {
  timezone: string;
  defaultReminderMinutes: number;
  defaultReminderChannels: string[];
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

async function preferences(db: any, organizationId: string, userId: string): Promise<CalendarPreference> {
  const [{ data: preference }, { data: availability }] = await Promise.all([
    db.from('calendar_preferences').select('timezone,default_reminder_minutes,default_reminder_channels').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
    db.from('calendar_availability').select('timezone').eq('organization_id', organizationId).eq('user_id', userId).eq('is_active', true).limit(1),
  ]);
  const timezone = isValidTimeZone(String(preference?.timezone || ''))
    ? String(preference.timezone)
    : isValidTimeZone(String(availability?.[0]?.timezone || ''))
      ? String(availability[0].timezone)
      : 'UTC';
  return {
    timezone,
    defaultReminderMinutes: Number(preference?.default_reminder_minutes ?? 15),
    defaultReminderChannels: Array.isArray(preference?.default_reminder_channels) && preference.default_reminder_channels.length ? preference.default_reminder_channels : ['in_app'],
  };
}

function dates(body: any, timezone: string) {
  const startsAt = body.localStartsAt ? localDateTimeToUtc(String(body.localStartsAt), timezone) : new Date(body.startsAt);
  const endsAt = body.localEndsAt ? localDateTimeToUtc(String(body.localEndsAt), timezone) : new Date(body.endsAt);
  const valid = startsAt instanceof Date && endsAt instanceof Date && !Number.isNaN(startsAt.valueOf()) && !Number.isNaN(endsAt.valueOf()) && endsAt > startsAt;
  return { startsAt: startsAt as Date, endsAt: endsAt as Date, valid };
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

function overlaps(start: Date, end: Date, otherStart: string, otherEnd: string) {
  return start < new Date(otherEnd) && end > new Date(otherStart);
}

async function loadOwnerSchedule(db: any, organizationId: string, userId: string) {
  const { data } = await db.from('calendar_events')
    .select('id,title,starts_at,ends_at,timezone,status,show_as,recurrence_rule,recurrence_series_id,recurrence_original_start')
    .eq('organization_id', organizationId)
    .eq('owner_user_id', userId)
    .limit(2000);
  return data ?? [];
}

function materializeBusy(rows: any[], from: Date, to: Date, excludeSeriesId?: string) {
  const roots = rows.filter(row => row.recurrence_rule && !row.recurrence_series_id && row.id !== excludeSeriesId && row.status !== 'cancelled' && row.show_as !== 'free');
  const overrides = rows.filter(row => row.recurrence_series_id && row.recurrence_original_start);
  const overrideMap = new Map(overrides.map(row => [`${row.recurrence_series_id}|${new Date(row.recurrence_original_start).toISOString()}`, row]));
  const busy: any[] = rows.filter(row => !row.recurrence_rule && !row.recurrence_series_id && row.id !== excludeSeriesId && row.status !== 'cancelled' && row.show_as !== 'free' && overlaps(from, to, row.starts_at, row.ends_at));
  const used = new Set<string>();

  for (const root of roots) {
    for (const occurrence of expandRecurringEvent(root, from, to, 500)) {
      const key = `${root.id}|${occurrence.originalStart}`;
      const override = overrideMap.get(key);
      if (override) {
        used.add(key);
        if (override.status !== 'cancelled' && override.show_as !== 'free' && overlaps(from, to, override.starts_at, override.ends_at)) busy.push(override);
      } else {
        busy.push({ id: recurrenceOccurrenceId(root.id, occurrence.originalStart), title: root.title, starts_at: occurrence.startsAt, ends_at: occurrence.endsAt, recurrence_series_id: root.id });
      }
    }
  }
  for (const override of overrides) {
    const key = `${override.recurrence_series_id}|${new Date(override.recurrence_original_start).toISOString()}`;
    if (used.has(key) || override.recurrence_series_id === excludeSeriesId || override.status === 'cancelled' || override.show_as === 'free') continue;
    if (overlaps(from, to, override.starts_at, override.ends_at)) busy.push(override);
  }
  return busy;
}

async function conflict(db: any, organizationId: string, userId: string, start: Date, end: Date, recurrenceRule?: string | null, excludeSeriesId?: string, showAs = 'busy') {
  if (showAs === 'free') return null;
  const rows = await loadOwnerSchedule(db, organizationId, userId);
  const candidate = recurrenceRule
    ? expandRecurringEvent({ id: '00000000-0000-4000-8000-000000000000', starts_at: start.toISOString(), ends_at: end.toISOString(), timezone: arguments[0] ? undefined : undefined, recurrence_rule: recurrenceRule }, start, new Date(start.getTime() + SERIES_CONFLICT_DAYS * 86400000), 500)
    : [{ startsAt: start.toISOString(), endsAt: end.toISOString() }];
  const candidateTimezone = rows.find(row => row.id === excludeSeriesId)?.timezone;
  if (recurrenceRule && candidateTimezone) {
    candidate.splice(0, candidate.length, ...expandRecurringEvent({ id: '00000000-0000-4000-8000-000000000000', starts_at: start.toISOString(), ends_at: end.toISOString(), timezone: candidateTimezone, recurrence_rule: recurrenceRule }, start, new Date(start.getTime() + SERIES_CONFLICT_DAYS * 86400000), 500));
  }
  const horizonEnd = recurrenceRule ? new Date(start.getTime() + SERIES_CONFLICT_DAYS * 86400000) : end;
  const busy = materializeBusy(rows, start, horizonEnd, excludeSeriesId);
  for (const item of candidate) {
    const candidateStart = new Date(item.startsAt);
    const candidateEnd = new Date(item.endsAt);
    const hit = busy.find(row => overlaps(candidateStart, candidateEnd, row.starts_at, row.ends_at));
    if (hit) return hit;
  }
  return null;
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

async function cloneChildren(db: any, organizationId: string, source: any, targetId: string) {
  const attendees = (source.calendar_attendees ?? []).map((row: any) => ({
    organization_id: organizationId,
    event_id: targetId,
    email: row.email,
    name: row.name,
    attendee_type: row.attendee_type,
    rsvp_status: row.rsvp_status,
  }));
  const reminders = (source.calendar_reminders ?? []).map((row: any) => ({
    organization_id: organizationId,
    event_id: targetId,
    channel: row.channel,
    minutes_before: row.minutes_before,
  }));
  const links = (source.calendar_event_links ?? []).map((row: any) => ({
    organization_id: organizationId,
    event_id: targetId,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    label: row.label,
  }));
  if (attendees.length) await db.from('calendar_attendees').insert(attendees);
  if (reminders.length) await db.from('calendar_reminders').insert(reminders);
  if (links.length) await db.from('calendar_event_links').insert(links);
}

async function sendInvites(db: any, workspace: any, event: any, origin: string, action: 'request' | 'update' | 'cancel', warnings: LifecycleWarning[]) {
  if (!event?.calendar_attendees?.length) return;
  const identity = organizer(workspace);
  if (!identity.email) {
    warnings.push({ area: 'invitation', message: 'Organizer email is unavailable, so invitations were not sent.' });
    return;
  }
  try {
    const result = await deliverCalendarInvitations({ db, event, organizerEmail: identity.email, organizerName: identity.name, origin, action });
    if (!result.ok) {
      const message = result.error
        || (result.partial
          ? `${result.failed} invitation(s) could not be delivered; ${result.sent} were sent successfully.`
          : `${result.failed} invitation(s) could not be delivered.`);
      warnings.push({ area: 'invitation', message });
    }
  } catch {
    warnings.push({ area: 'invitation', message: 'Calendar invitation delivery failed unexpectedly. The event was saved, but attendee delivery needs attention.' });
  }
}

function windowBounds(req: NextRequest) {
  const now = new Date();
  const requestedFrom = req.nextUrl.searchParams.get('from');
  const requestedTo = req.nextUrl.searchParams.get('to');
  const from = requestedFrom && !Number.isNaN(new Date(requestedFrom).valueOf()) ? new Date(requestedFrom) : new Date(now.getTime() - 90 * 86400000);
  const to = requestedTo && !Number.isNaN(new Date(requestedTo).valueOf()) ? new Date(requestedTo) : new Date(now.getTime() + 550 * 86400000);
  return { from, to };
}

export async function GET(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === '1';
  const { from, to } = windowBounds(req);
  const select = '*,calendar_attendees(*),calendar_reminders(*),calendar_event_links(*)';
  const [ordinaryResult, rootResult, overrideResult, preference] = await Promise.all([
    ctx.supabase.from('calendar_events').select(select).eq('organization_id', organizationId).is('recurrence_rule', null).is('recurrence_series_id', null).lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()).limit(1000),
    ctx.supabase.from('calendar_events').select(select).eq('organization_id', organizationId).not('recurrence_rule', 'is', null).is('recurrence_series_id', null).limit(250),
    ctx.supabase.from('calendar_events').select(select).eq('organization_id', organizationId).not('recurrence_series_id', 'is', null).limit(1000),
    preferences(ctx.supabase, organizationId, userId),
  ]);
  if (ordinaryResult.error || rootResult.error || overrideResult.error) return NextResponse.json({ error: 'Unable to load calendar.' }, { status: 500 });

  const ordinary = (ordinaryResult.data ?? []).filter((event: any) => includeCancelled || event.status !== 'cancelled');
  const roots = (rootResult.data ?? []).filter((event: any) => includeCancelled || event.status !== 'cancelled');
  const overrides = overrideResult.data ?? [];
  const overrideMap = new Map(overrides.map((event: any) => [`${event.recurrence_series_id}|${new Date(event.recurrence_original_start).toISOString()}`, event]));
  const usedOverrides = new Set<string>();
  const recurring: any[] = [];

  for (const root of roots) {
    for (const occurrence of expandRecurringEvent(root, from, to, 500)) {
      const key = `${root.id}|${occurrence.originalStart}`;
      const override = overrideMap.get(key);
      if (override) {
        usedOverrides.add(key);
        if ((includeCancelled || override.status !== 'cancelled') && overlaps(from, to, override.starts_at, override.ends_at)) recurring.push(override);
        continue;
      }
      recurring.push({
        ...root,
        id: recurrenceOccurrenceId(root.id, occurrence.originalStart),
        source_event_id: root.id,
        recurrence_series_id: root.id,
        recurrence_original_start: occurrence.originalStart,
        recurrence_virtual: true,
        starts_at: occurrence.startsAt,
        ends_at: occurrence.endsAt,
      });
    }
  }
  for (const override of overrides) {
    const key = `${override.recurrence_series_id}|${new Date(override.recurrence_original_start).toISOString()}`;
    if (usedOverrides.has(key) || (!includeCancelled && override.status === 'cancelled')) continue;
    if (overlaps(from, to, override.starts_at, override.ends_at)) recurring.push(override);
  }

  const events = [...ordinary, ...recurring].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)).slice(0, 1500);
  return NextResponse.json({ events, preferences: preference });
}

export async function POST(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const preference = await preferences(ctx.supabase, organizationId, userId);
  const timezone = isValidTimeZone(String(body.timezone || '')) ? String(body.timezone) : preference.timezone;
  const validDates = dates(body, timezone);
  if (!title || !validDates.valid) return NextResponse.json({ error: 'Add a title and valid start/end time. DST-skipped local times are not valid.' }, { status: 400 });

  let recurrenceRule: string | null = null;
  try {
    recurrenceRule = normalizeRecurrenceRule(body.recurrenceRule);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Choose a supported recurrence pattern.' }, { status: 400 });
  }

  const provider = PROVIDERS.has(body.meetingProvider) ? body.meetingProvider : 'none';
  const showAs = SHOW_AS.has(body.showAs) ? body.showAs : 'busy';
  const visibility = VISIBILITY.has(body.visibility) ? body.visibility : 'organization';
  const hit = await conflict(ctx.supabase, organizationId, userId, validDates.startsAt, validDates.endsAt, recurrenceRule, undefined, showAs);
  if (hit && !body.allowConflict) return NextResponse.json({ error: recurrenceRule ? 'This recurring schedule overlaps another calendar event.' : 'This time overlaps another calendar event.', conflict: hit }, { status: 409 });
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
    timezone,
    is_all_day: Boolean(body.isAllDay),
    visibility,
    show_as: showAs,
    recurrence_rule: recurrenceRule,
    meeting_provider: provider,
    meeting_url: provider === 'custom' ? body.meetingUrl || null : null,
    ics_sequence: 0,
  }).select('*').single();
  if (error || !event) return NextResponse.json({ error: 'Unable to create event.' }, { status: 500 });

  const effectiveBody = body.reminderMinutes === undefined
    ? { ...body, reminderMinutes: preference.defaultReminderMinutes, reminderChannels: preference.defaultReminderChannels }
    : body;
  try {
    await syncChildren(ctx.supabase, organizationId, event.id, effectiveBody);
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

async function resolveMutationTarget(db: any, organizationId: string, id: string, scope: string) {
  const virtual = parseRecurrenceOccurrenceId(id);
  if (virtual) {
    const root = await hydrateEvent(db, organizationId, virtual.seriesId);
    if (!root || !root.recurrence_rule) return null;
    if (scope === 'series') return { kind: 'series' as const, existing: root, root, originalStart: virtual.originalStart };
    const { data: override } = await db.from('calendar_events').select('id').eq('organization_id', organizationId).eq('recurrence_series_id', root.id).eq('recurrence_original_start', virtual.originalStart).maybeSingle();
    return { kind: 'occurrence' as const, existing: override ? await hydrateEvent(db, organizationId, override.id) : null, root, originalStart: virtual.originalStart };
  }
  const existing = await hydrateEvent(db, organizationId, id);
  if (!existing) return null;
  if (existing.recurrence_series_id) {
    const root = await hydrateEvent(db, organizationId, existing.recurrence_series_id);
    if (!root) return null;
    if (scope === 'series') return { kind: 'series' as const, existing: root, root, originalStart: existing.recurrence_original_start };
    return { kind: 'occurrence' as const, existing, root, originalStart: new Date(existing.recurrence_original_start).toISOString() };
  }
  return { kind: 'series' as const, existing, root: existing, originalStart: null };
}

async function occurrenceBase(root: any, originalStart: string) {
  const duration = new Date(root.ends_at).getTime() - new Date(root.starts_at).getTime();
  const start = new Date(originalStart);
  return { start, end: new Date(start.getTime() + duration) };
}

async function ensureOccurrenceOverride(db: any, organizationId: string, userId: string, root: any, originalStart: string, sequence: number) {
  const { data: row } = await db.from('calendar_events').select('id').eq('organization_id', organizationId).eq('recurrence_series_id', root.id).eq('recurrence_original_start', originalStart).maybeSingle();
  if (row) return hydrateEvent(db, organizationId, row.id);
  const base = await occurrenceBase(root, originalStart);
  const { data: created, error } = await db.from('calendar_events').insert({
    organization_id: organizationId,
    owner_user_id: root.owner_user_id,
    created_by: userId,
    title: root.title,
    description: root.description,
    location: root.location,
    starts_at: base.start.toISOString(),
    ends_at: base.end.toISOString(),
    timezone: root.timezone,
    is_all_day: root.is_all_day,
    status: 'confirmed',
    visibility: root.visibility,
    show_as: root.show_as,
    meeting_provider: root.meeting_provider,
    meeting_url: root.meeting_url,
    meeting_external_id: root.meeting_external_id,
    meeting_host_url: root.meeting_host_url,
    meeting_password: root.meeting_password,
    meeting_metadata: root.meeting_metadata || {},
    recurrence_rule: null,
    recurrence_series_id: root.id,
    recurrence_original_start: originalStart,
    ics_sequence: sequence,
  }).select('*').single();
  if (error || !created) throw new Error('Unable to create recurring occurrence override.');
  await cloneChildren(db, organizationId, root, created.id);
  return hydrateEvent(db, organizationId, created.id);
}

export async function PATCH(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });
  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const scope = body.scope === 'occurrence' ? 'occurrence' : 'series';
  const target = await resolveMutationTarget(ctx.supabase, organizationId, id, scope);
  if (!target) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  if (target.existing?.status === 'cancelled' && target.kind !== 'occurrence') return NextResponse.json({ error: 'Cancelled events cannot be edited.' }, { status: 409 });

  if (target.kind === 'occurrence') {
    if (body.meetingProvider !== undefined && body.meetingProvider !== target.root.meeting_provider) return NextResponse.json({ error: 'Change the meeting provider for the entire series, not one occurrence.' }, { status: 409 });
    const base = target.existing || await occurrenceBase(target.root, target.originalStart);
    const timezone = isValidTimeZone(String(body.timezone || target.root.timezone || '')) ? String(body.timezone || target.root.timezone) : 'UTC';
    const dateInput = {
      startsAt: body.startsAt ?? ('starts_at' in base ? base.starts_at : base.start.toISOString()),
      endsAt: body.endsAt ?? ('ends_at' in base ? base.ends_at : base.end.toISOString()),
      localStartsAt: body.localStartsAt,
      localEndsAt: body.localEndsAt,
    };
    const validDates = dates(dateInput, timezone);
    if (!validDates.valid) return NextResponse.json({ error: 'Add a valid start/end time. DST-skipped local times are not valid.' }, { status: 400 });
    const showAs = SHOW_AS.has(body.showAs) ? body.showAs : target.existing?.show_as || target.root.show_as || 'busy';
    const hit = await conflict(ctx.supabase, organizationId, target.root.owner_user_id, validDates.startsAt, validDates.endsAt, null, target.root.id, showAs);
    if (hit && !body.allowConflict) return NextResponse.json({ error: 'This occurrence overlaps another calendar event.', conflict: hit }, { status: 409 });

    const nextSequence = Number(target.root.ics_sequence ?? 0) + 1;
    await ctx.supabase.from('calendar_events').update({ ics_sequence: nextSequence, updated_at: new Date().toISOString() }).eq('id', target.root.id).eq('organization_id', organizationId);
    let occurrence = target.existing || await ensureOccurrenceOverride(ctx.supabase, organizationId, userId, target.root, target.originalStart, nextSequence);
    const patch: any = {
      updated_at: new Date().toISOString(),
      starts_at: validDates.startsAt.toISOString(),
      ends_at: validDates.endsAt.toISOString(),
      timezone,
      status: 'confirmed',
      cancelled_at: null,
      ics_sequence: nextSequence,
    };
    const fields = {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      description: body.description !== undefined ? body.description || null : undefined,
      location: body.location !== undefined ? body.location || null : undefined,
      is_all_day: body.isAllDay,
      visibility: body.visibility !== undefined && VISIBILITY.has(body.visibility) ? body.visibility : undefined,
      show_as: body.showAs !== undefined && SHOW_AS.has(body.showAs) ? body.showAs : undefined,
      meeting_url: body.meetingUrl !== undefined ? body.meetingUrl || null : undefined,
    };
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) patch[key] = value;
    const { data: updated, error } = await ctx.supabase.from('calendar_events').update(patch).eq('id', occurrence.id).eq('organization_id', organizationId).select('*').single();
    if (error || !updated) return NextResponse.json({ error: 'Unable to update this occurrence.' }, { status: 500 });
    try { await syncChildren(ctx.supabase, organizationId, occurrence.id, body); } catch { return NextResponse.json({ error: 'Occurrence was updated, but attendees or reminders could not be synchronized.' }, { status: 500 }); }
    occurrence = await hydrateEvent(ctx.supabase, organizationId, occurrence.id);
    const warnings: LifecycleWarning[] = [];
    if (occurrence) await sendInvites(ctx.supabase, ctx.workspace, occurrence, req.nextUrl.origin, 'update', warnings);
    return NextResponse.json({ event: occurrence ?? updated, warnings, scope: 'occurrence' });
  }

  const existing = target.existing;
  if (existing.status === 'cancelled') return NextResponse.json({ error: 'Cancelled events cannot be edited.' }, { status: 409 });
  const preference = await preferences(ctx.supabase, organizationId, existing.owner_user_id);
  const timezone = isValidTimeZone(String(body.timezone || existing.timezone || '')) ? String(body.timezone || existing.timezone) : preference.timezone;
  const validDates = dates({ startsAt: body.startsAt ?? existing.starts_at, endsAt: body.endsAt ?? existing.ends_at, localStartsAt: body.localStartsAt, localEndsAt: body.localEndsAt }, timezone);
  if (!validDates.valid) return NextResponse.json({ error: 'Add a valid start/end time. DST-skipped local times are not valid.' }, { status: 400 });
  let recurrenceRule = existing.recurrence_rule;
  if (body.recurrenceRule !== undefined) {
    try { recurrenceRule = normalizeRecurrenceRule(body.recurrenceRule); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Choose a supported recurrence pattern.' }, { status: 400 }); }
  }
  const scheduleChanged = validDates.startsAt.toISOString() !== existing.starts_at || validDates.endsAt.toISOString() !== existing.ends_at || recurrenceRule !== existing.recurrence_rule || timezone !== existing.timezone;
  if (scheduleChanged && existing.recurrence_rule) {
    const { data: exceptions } = await ctx.supabase.from('calendar_events').select('id').eq('organization_id', organizationId).eq('recurrence_series_id', existing.id).limit(1);
    if (exceptions?.length && body.resetExceptions !== true) return NextResponse.json({ error: 'Changing the series schedule will reset occurrence-specific changes. Continue?', code: 'SERIES_EXCEPTIONS_RESET_REQUIRED' }, { status: 409 });
    if (exceptions?.length && body.resetExceptions === true) await ctx.supabase.from('calendar_events').delete().eq('organization_id', organizationId).eq('recurrence_series_id', existing.id);
  }

  const showAs = SHOW_AS.has(body.showAs) ? body.showAs : existing.show_as || 'busy';
  const hit = await conflict(ctx.supabase, organizationId, existing.owner_user_id, validDates.startsAt, validDates.endsAt, recurrenceRule, existing.id, showAs);
  if (hit && !body.allowConflict) return NextResponse.json({ error: recurrenceRule ? 'This recurring schedule overlaps another calendar event.' : 'This time overlaps another calendar event.', conflict: hit }, { status: 409 });
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
    if (removed.length) await sendInvites(ctx.supabase, ctx.workspace, { ...existing, calendar_attendees: removed, ics_sequence: Number(existing.ics_sequence ?? 0) + 1 }, req.nextUrl.origin, 'cancel', warnings);
  }
  if (existing.meeting_provider === 'zoom' && targetProvider !== 'zoom' && existing.meeting_external_id) {
    const zoomCancel = await cancelZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, existing);
    if (!zoomCancel.ok) return NextResponse.json({ error: zoomCancel.error || 'Unable to remove the existing Zoom meeting.' }, { status: 502 });
  }

  const patch: any = {
    updated_at: new Date().toISOString(),
    starts_at: validDates.startsAt.toISOString(),
    ends_at: validDates.endsAt.toISOString(),
    timezone,
    recurrence_rule: recurrenceRule,
    ics_sequence: Number(existing.ics_sequence ?? 0) + 1,
  };
  const fields = {
    title: body.title !== undefined ? String(body.title).trim() : undefined,
    description: body.description !== undefined ? body.description || null : undefined,
    location: body.location !== undefined ? body.location || null : undefined,
    is_all_day: body.isAllDay,
    status: body.status,
    visibility: body.visibility !== undefined && VISIBILITY.has(body.visibility) ? body.visibility : undefined,
    show_as: body.showAs !== undefined && SHOW_AS.has(body.showAs) ? body.showAs : undefined,
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

  const { data: updated, error } = await ctx.supabase.from('calendar_events').update(patch).eq('id', existing.id).eq('organization_id', organizationId).select('*').single();
  if (error || !updated) return NextResponse.json({ error: 'Unable to update event.' }, { status: 500 });
  try { await syncChildren(ctx.supabase, organizationId, existing.id, body); } catch { return NextResponse.json({ error: 'Event was updated, but attendees or reminders could not be synchronized.' }, { status: 500 }); }

  let hydrated = await hydrateEvent(ctx.supabase, organizationId, existing.id);
  if (targetProvider === 'zoom' && hydrated) {
    const zoom = existing.meeting_provider === 'zoom' && existing.meeting_external_id
      ? await updateZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, hydrated)
      : await createZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, hydrated);
    if (!zoom.ok) warnings.push({ area: 'zoom', message: zoom.error || 'Zoom meeting could not be synchronized.' });
    hydrated = await hydrateEvent(ctx.supabase, organizationId, existing.id);
  }
  if (hydrated && !(targetProvider === 'zoom' && !hydrated.meeting_url)) await sendInvites(ctx.supabase, ctx.workspace, hydrated, req.nextUrl.origin, 'update', warnings);
  return NextResponse.json({ event: hydrated ?? updated, warnings, scope: 'series' });
}

export async function DELETE(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const id = String(req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });
  const scope = req.nextUrl.searchParams.get('scope') === 'occurrence' ? 'occurrence' : 'series';
  const organizationId = ctx.workspace.organization!.id;
  const userId = ctx.workspace.user!.id;
  const target = await resolveMutationTarget(ctx.supabase, organizationId, id, scope);
  if (!target) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  if (target.kind === 'occurrence') {
    const nextSequence = Number(target.root.ics_sequence ?? 0) + 1;
    await ctx.supabase.from('calendar_events').update({ ics_sequence: nextSequence, updated_at: new Date().toISOString() }).eq('id', target.root.id).eq('organization_id', organizationId);
    let occurrence = target.existing || await ensureOccurrenceOverride(ctx.supabase, organizationId, userId, target.root, target.originalStart, nextSequence);
    if (occurrence.status === 'cancelled') return NextResponse.json({ ok: true, cancelled: true, scope: 'occurrence', warnings: [] });
    const now = new Date().toISOString();
    const { data: cancelled, error } = await ctx.supabase.from('calendar_events').update({ status: 'cancelled', cancelled_at: now, ics_sequence: nextSequence, updated_at: now }).eq('id', occurrence.id).eq('organization_id', organizationId).select('*').single();
    if (error || !cancelled) return NextResponse.json({ error: 'Unable to cancel this occurrence.' }, { status: 500 });
    occurrence = await hydrateEvent(ctx.supabase, organizationId, occurrence.id);
    const warnings: LifecycleWarning[] = [];
    if (occurrence) await sendInvites(ctx.supabase, ctx.workspace, occurrence, req.nextUrl.origin, 'cancel', warnings);
    return NextResponse.json({ ok: true, cancelled: true, scope: 'occurrence', warnings });
  }

  const existing = target.existing;
  if (existing.status === 'cancelled') return NextResponse.json({ ok: true, cancelled: true, scope: 'series', warnings: [] });
  const now = new Date().toISOString();
  const { data: cancelled, error } = await ctx.supabase.from('calendar_events').update({
    status: 'cancelled',
    cancelled_at: now,
    ics_sequence: Number(existing.ics_sequence ?? 0) + 1,
    updated_at: now,
  }).eq('id', existing.id).eq('organization_id', organizationId).select('*').single();
  if (error || !cancelled) return NextResponse.json({ error: 'Unable to cancel event.' }, { status: 500 });
  if (existing.recurrence_rule) await ctx.supabase.from('calendar_events').update({ status: 'cancelled', cancelled_at: now, updated_at: now }).eq('organization_id', organizationId).eq('recurrence_series_id', existing.id);

  const warnings: LifecycleWarning[] = [];
  const hydrated = await hydrateEvent(ctx.supabase, organizationId, existing.id);
  if (hydrated) await sendInvites(ctx.supabase, ctx.workspace, hydrated, req.nextUrl.origin, 'cancel', warnings);
  if (existing.meeting_external_id) {
    const zoom = await cancelZoomMeetingForEvent(ctx.supabase, organizationId, existing.owner_user_id, existing);
    if (!zoom.ok) warnings.push({ area: 'zoom', message: zoom.error || 'Setu cancelled the event, but the remote Zoom meeting still needs attention.' });
  }
  return NextResponse.json({ ok: true, cancelled: true, scope: 'series', warnings });
}
