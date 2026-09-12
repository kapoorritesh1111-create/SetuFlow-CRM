import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { expandRecurringEvent } from '@/lib/calendar/recurrence';

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
  const { error } = await db.from('notifications').insert({
    organization_id: event.organization_id,
    user_id: event.owner_user_id,
    type: 'calendar_reminder',
    title: `Upcoming: ${event.title}`,
    body: `${formattedWhen(event, occurrenceStart)} · ${event.timezone || 'UTC'}`,
    icon: 'calendar',
    priority: 'normal',
    entity_type: 'calendar_event',
    entity_id: event.id,
    entity_ref: event.recurrence_rule ? `${event.id}:${occurrenceStart}` : event.id,
    action_url: '/calendar',
    channels_sent: ['in_app'],
  });
  if (error) throw error;
}

async function markRecurringDelivery(db: any, reminder: any, event: any, occurrenceStart: string) {
  const { error } = await db.from('calendar_reminder_deliveries').insert({
    organization_id: event.organization_id,
    reminder_id: reminder.id,
    event_id: event.id,
    occurrence_start: occurrenceStart,
    channel: reminder.channel,
    sent_at: new Date().toISOString(),
  });
  if (error && error.code !== '23505') throw error;
}

export async function GET(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceRoleClient() as any;
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const now = new Date();
  const window = occurrenceWindow(now);
  const { data: reminders, error: reminderError } = await db.from('calendar_reminders').select('*,calendar_events(*)').limit(500);
  if (reminderError) return NextResponse.json({ error: 'Unable to load Calendar reminders.' }, { status: 500 });

  const recurringEventIds = [...new Set((reminders ?? []).filter((row: any) => row.calendar_events?.recurrence_rule).map((row: any) => row.calendar_events.id))];
  const recurringReminderIds = (reminders ?? []).filter((row: any) => row.calendar_events?.recurrence_rule).map((row: any) => row.id);
  const delivered = new Set<string>();
  if (recurringReminderIds.length) {
    const { data: rows } = await db.from('calendar_reminder_deliveries')
      .select('reminder_id,occurrence_start,channel')
      .in('reminder_id', recurringReminderIds)
      .gte('occurrence_start', window.from.toISOString())
      .lt('occurrence_start', window.to.toISOString());
    for (const row of rows ?? []) delivered.add(`${row.reminder_id}|${new Date(row.occurrence_start).toISOString()}|${row.channel}`);
  }

  // A moved/cancelled occurrence has its own cloned reminder rows. Suppress the
  // root-series reminder for the original occurrence so users never receive both.
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

  for (const reminder of reminders ?? []) {
    const event: any = reminder.calendar_events;
    if (!event || event.status === 'cancelled') continue;
    if (!event.recurrence_rule && reminder.sent_at) continue;

    const occurrences = event.recurrence_rule
      ? expandRecurringEvent(event, window.from, window.to, 32).map(item => item.startsAt)
      : [event.starts_at];

    for (const occurrenceStart of occurrences) {
      const occurrence = new Date(occurrenceStart);
      if (event.recurrence_rule && recurringExceptions.has(exceptionKey(event.id, occurrence.toISOString()))) continue;
      const due = new Date(occurrence.getTime() - Number(reminder.minutes_before || 0) * 60000);
      if (due > now || occurrence < window.from) continue;
      const deliveryKey = `${reminder.id}|${occurrence.toISOString()}|${reminder.channel}`;
      if (event.recurrence_rule && delivered.has(deliveryKey)) continue;

      try {
        if (reminder.channel === 'email') {
          let recipient = profileCache.get(event.owner_user_id);
          if (recipient === undefined) {
            const { data: profile } = await db.from('profiles').select('email').eq('id', event.owner_user_id).maybeSingle();
            recipient = profile?.email || null;
            profileCache.set(event.owner_user_id, recipient);
          }
          if (!recipient) throw new Error('Calendar owner email is unavailable');
          await sendEmail(event, occurrence.toISOString(), recipient);
        } else if (reminder.channel === 'in_app') {
          await sendInApp(db, event, occurrence.toISOString());
        } else {
          continue;
        }

        if (event.recurrence_rule) {
          await markRecurringDelivery(db, reminder, event, occurrence.toISOString());
          delivered.add(deliveryKey);
        } else {
          const { error } = await db.from('calendar_reminders').update({ sent_at: now.toISOString() }).eq('id', reminder.id).is('sent_at', null);
          if (error) throw error;
        }
        processed += 1;
      } catch (error) {
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

  return NextResponse.json({ ok: true, processed, failed });
}
