import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { expandRecurringEvent } from '@/lib/calendar/recurrence';
import { isCalendarReminderDue } from '@/lib/calendar/reminder-window';
import { dispatchCommunicationNotification } from '@/lib/notifications/communication-notification-service';

export const dynamic = 'force-dynamic';

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character));
}

function occurrenceWindow(now: Date) {
  return {
    from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    to: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
  };
}

function formattedWhen(event: any, occurrenceStart: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: event.timezone || 'UTC',
  }).format(new Date(occurrenceStart));
}

function exceptionKey(seriesId: string, originalStart: string) {
  return `${seriesId}|${new Date(originalStart).toISOString()}`;
}

function isSeriesRoot(event: any) {
  return Boolean(event?.recurrence_rule && !event?.recurrence_series_id);
}

async function sendEmail(event: any, occurrenceStart: string, recipient: string) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.RESEND_FROM_EMAIL || process.env.SETU_NOTIFICATION_FROM_EMAIL || '').trim();
  if (!apiKey || !from) throw new Error('Email reminders are not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: `Reminder: ${event.title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2>${esc(event.title)}</h2><p>Starts ${esc(formattedWhen(event, occurrenceStart))} (${esc(event.timezone || 'UTC')})</p>${event.meeting_url ? `<p><a href="${esc(event.meeting_url)}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px">Join meeting</a></p>` : ''}</div>`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Reminder email failed');
}

async function sendInApp(db: any, event: any, occurrenceStart: string) {
  const occurrenceIso = new Date(occurrenceStart).toISOString();
  await dispatchCommunicationNotification(db, {
    organizationId: event.organization_id,
    userIds: [event.owner_user_id],
    type: 'calendar_reminder',
    title: `Upcoming: ${event.title}`,
    body: `${formattedWhen(event, occurrenceIso)} · ${event.timezone || 'UTC'}`,
    icon: 'calendar',
    entityType: 'calendar_event',
    entityId: event.id,
    entityRef: `${event.id}:${occurrenceIso}`,
    actionUrl: `/calendar?eventId=${encodeURIComponent(event.id)}&occurrenceStart=${encodeURIComponent(occurrenceIso)}`,
    priority: 'normal',
  });
}

async function claimDelivery(db: any, reminder: any, event: any, occurrenceStart: string) {
  const occurrenceIso = new Date(occurrenceStart).toISOString();
  const { error } = await db.from('calendar_reminder_deliveries').insert({
    organization_id: event.organization_id,
    reminder_id: reminder.id,
    event_id: event.id,
    occurrence_start: occurrenceIso,
    channel: reminder.channel,
    sent_at: new Date().toISOString(),
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}

async function releaseDelivery(db: any, reminder: any, occurrenceStart: string) {
  const occurrenceIso = new Date(occurrenceStart).toISOString();
  await db.from('calendar_reminder_deliveries')
    .delete()
    .eq('reminder_id', reminder.id)
    .eq('occurrence_start', occurrenceIso)
    .eq('channel', reminder.channel);
}

export async function GET(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceRoleClient() as any;
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const now = new Date();
  const window = occurrenceWindow(now);
  const { data: reminders, error: reminderError } = await db.from('calendar_reminders').select('*').limit(500);
  if (reminderError) return NextResponse.json({ error: 'Unable to load Calendar reminders.' }, { status: 500 });

  // Load events explicitly. A failed or empty embedded relationship previously made
  // eligible reminders look like harmless rows with no event and they were silently skipped.
  const eventIds = [...new Set((reminders ?? []).map((row: any) => row.event_id).filter(Boolean))];
  const { data: events, error: eventError } = eventIds.length
    ? await db.from('calendar_events').select('*').in('id', eventIds)
    : { data: [], error: null };
  if (eventError) return NextResponse.json({ error: 'Unable to load Calendar reminder events.' }, { status: 500 });
  const eventsById = new Map((events ?? []).map((event: any) => [event.id, event]));

  const recurringRoots = (reminders ?? []).filter((row: any) => isSeriesRoot(eventsById.get(row.event_id)));
  const recurringEventIds = [...new Set(recurringRoots.map((row: any) => row.event_id))];
  const recurringExceptions = new Set<string>();
  if (recurringEventIds.length) {
    const { data: rows } = await db.from('calendar_events')
      .select('recurrence_series_id,recurrence_original_start')
      .in('recurrence_series_id', recurringEventIds)
      .not('recurrence_original_start', 'is', null)
      .gte('recurrence_original_start', window.from.toISOString())
      .lt('recurrence_original_start', window.to.toISOString());
    for (const row of rows ?? []) {
      if (row.recurrence_series_id && row.recurrence_original_start) recurringExceptions.add(exceptionKey(row.recurrence_series_id, row.recurrence_original_start));
    }
  }

  const profileCache = new Map<string, string | null>();
  let processed = 0;
  let failed = 0;
  let deduplicated = 0;
  let eligible = 0;
  let missingEvents = 0;
  const timingCandidates: Array<Record<string, unknown>> = [];

  for (const reminder of reminders ?? []) {
    const event: any = eventsById.get(reminder.event_id);
    if (!event) {
      missingEvents += 1;
      console.warn('[setu-calendar:reminder] event unavailable', { reminderId: reminder.id, eventId: reminder.event_id });
      continue;
    }
    if (event.status === 'cancelled') continue;
    const recurringRoot = isSeriesRoot(event);
    if (!recurringRoot && reminder.sent_at) continue;

    const occurrences = recurringRoot
      ? expandRecurringEvent(event, window.from, window.to, 32).map(item => item.startsAt)
      : [event.starts_at];

    for (const occurrenceStart of occurrences) {
      const occurrence = new Date(occurrenceStart);
      if (recurringRoot && recurringExceptions.has(exceptionKey(event.id, occurrence.toISOString()))) continue;
      if (!isCalendarReminderDue(occurrenceStart, Number(reminder.minutes_before || 0), now)) {
        const startMs = Date.parse(occurrenceStart);
        const minutesBefore = Number(reminder.minutes_before || 0);
        const dueMs = startMs - minutesBefore * 60000;
        if (!reminder.sent_at && Number.isFinite(startMs) && startMs >= now.getTime() && timingCandidates.length < 10) {
          timingCandidates.push({ reminderId: reminder.id, eventId: event.id, occurrenceStart, minutesBefore, now: now.toISOString(), dueAt: new Date(dueMs).toISOString(), millisecondsUntilStart: startMs - now.getTime() });
        }
        continue;
      }
      eligible += 1;

      let claimed = false;
      try {
        claimed = await claimDelivery(db, reminder, event, occurrence.toISOString());
        if (!claimed) {
          deduplicated += 1;
          continue;
        }

        if (reminder.channel === 'email') {
          let recipient = profileCache.get(event.owner_user_id);
          if (recipient === undefined) {
            const { data: profile } = await db.from('profiles').select('email').eq('id', event.owner_user_id).maybeSingle();
            const resolvedRecipient: string | null = profile?.email ? String(profile.email) : null;
            profileCache.set(event.owner_user_id, resolvedRecipient);
            recipient = resolvedRecipient;
          }
          if (!recipient) throw new Error('Calendar owner email is unavailable');
          await sendEmail(event, occurrence.toISOString(), recipient);
        } else if (reminder.channel === 'in_app') {
          await sendInApp(db, event, occurrence.toISOString());
        } else {
          await releaseDelivery(db, reminder, occurrence.toISOString());
          continue;
        }

        if (!recurringRoot) {
          const { error } = await db.from('calendar_reminders').update({ sent_at: now.toISOString() }).eq('id', reminder.id).is('sent_at', null);
          if (error) console.warn('[setu-calendar:reminder] sent_at update failed after claimed delivery', { reminderId: reminder.id, error: error.message });
        }
        processed += 1;
      } catch (error) {
        if (claimed) await releaseDelivery(db, reminder, occurrence.toISOString());
        failed += 1;
        console.warn('[setu-calendar:reminder] delivery failed', {
          reminderId: reminder.id,
          eventId: event.id,
          occurrenceStart: occurrence.toISOString(),
          channel: reminder.channel,
          error: error instanceof Error ? error.message : 'Unknown reminder error',
        });
      }
    }
  }

  const summary = { scanned: reminders?.length ?? 0, eventsLoaded: events?.length ?? 0, eligible, processed, failed, deduplicated, missingEvents, timingCandidates };
  console.info('[setu-calendar:reminder] run complete', summary);
  return NextResponse.json({ ok: failed === 0, ...summary }, { status: failed > 0 ? 500 : 200 });
}
