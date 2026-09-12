import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';
import { isValidTimeZone, localDateTimeToUtc } from '@/lib/calendar/recurrence';

export const dynamic = 'force-dynamic';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';

function fail(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add this invitation to Calendar.' }, { status: 500 });
}

function unfold(value: string) {
  return value.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function field(lines: string[], name: string) {
  const upper = `${name.toUpperCase()}:`;
  const parameterized = `${name.toUpperCase()};`;
  const line = lines.find(item => item.toUpperCase().startsWith(upper) || item.toUpperCase().startsWith(parameterized));
  if (!line) return null;
  const split = line.indexOf(':');
  return split >= 0 ? { meta: line.slice(0, split), value: line.slice(split + 1).trim() } : null;
}

function text(value: string | null | undefined) {
  return String(value || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

function parseDate(entry: ReturnType<typeof field>) {
  if (!entry) return null;
  const raw = entry.value;
  const tzid = /(?:^|;)TZID=([^;:]+)/i.exec(entry.meta)?.[1]?.replace(/^"|"$/g, '') || null;
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const iso = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}Z`;
    const date = new Date(iso);
    return Number.isNaN(date.valueOf()) ? null : { date, timezone: 'UTC', allDay: false };
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    const local = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}`;
    if (tzid && isValidTimeZone(tzid)) return { date: localDateTimeToUtc(local, tzid), timezone: tzid, allDay: false };
    const date = new Date(`${local}Z`);
    return Number.isNaN(date.valueOf()) ? null : { date, timezone: 'UTC', allDay: false };
  }
  if (/^\d{8}$/.test(raw)) {
    const iso = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00Z`;
    return { date: new Date(iso), timezone: tzid && isValidTimeZone(tzid) ? tzid : 'UTC', allDay: true };
  }
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? null : { date, timezone: tzid && isValidTimeZone(tzid) ? tzid : 'UTC', allDay: false };
}

function parseInvite(value: string) {
  const lines = unfold(value);
  const method = field(lines, 'METHOD')?.value.toUpperCase();
  if (method && method !== 'REQUEST' && method !== 'PUBLISH') return null;
  const uid = text(field(lines, 'UID')?.value);
  const start = parseDate(field(lines, 'DTSTART'));
  const end = parseDate(field(lines, 'DTEND'));
  if (!uid || !start || !end || end.date <= start.date) return null;
  const title = text(field(lines, 'SUMMARY')?.value) || 'Calendar invitation';
  const description = text(field(lines, 'DESCRIPTION')?.value);
  const location = text(field(lines, 'LOCATION')?.value);
  const organizer = field(lines, 'ORGANIZER')?.value.replace(/^mailto:/i, '').trim().toLowerCase() || null;
  const urlField = text(field(lines, 'URL')?.value);
  const haystack = [urlField, location, description].filter(Boolean).join('\n');
  const meetingUrl = /(https?:\/\/[^\s<>"']+)/i.exec(haystack)?.[1]?.replace(/[),.;]+$/g, '') || null;
  return { uid, title: title.slice(0, 240), description: description || null, location: location || null, organizer, startsAt: start.date.toISOString(), endsAt: end.date.toISOString(), timezone: start.timezone, isAllDay: start.allDay, meetingUrl };
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    const body = await request.json().catch(() => null) as { attachmentId?: string; messageId?: string } | null;
    const attachmentId = String(body?.attachmentId || '');
    const messageId = String(body?.messageId || '');
    if (!isMailId(attachmentId) || !isMailId(messageId)) return NextResponse.json({ error: 'Choose a valid calendar invitation.' }, { status: 400 });

    const [{ data: attachment, error: attachmentError }, { data: message, error: messageError }] = await Promise.all([
      ctx.db.from('mail_attachments').select('id,message_id,filename,content_type,storage_path,security_status').eq('id', attachmentId).eq('message_id', messageId).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).maybeSingle(),
      ctx.db.from('mail_messages').select('id,from_address').eq('id', messageId).eq('organization_id', ctx.organizationId).eq('mailbox_id', ctx.mailbox.id).maybeSingle(),
    ]);
    if (attachmentError || messageError) return NextResponse.json({ error: 'Unable to verify this invitation.' }, { status: 503 });
    if (!attachment || !message) return NextResponse.json({ error: 'Calendar invitation not found.' }, { status: 404 });
    const isCalendar = String(attachment.content_type || '').toLowerCase().startsWith('text/calendar') || String(attachment.filename || '').toLowerCase().endsWith('.ics');
    if (!isCalendar) return NextResponse.json({ error: 'This attachment is not a calendar invitation.' }, { status: 415 });
    if (attachment.security_status !== 'clean') return NextResponse.json({ error: 'This calendar attachment has not passed attachment security checks.' }, { status: 409 });

    const download = await ctx.db.storage.from(ATTACHMENT_BUCKET).download(attachment.storage_path);
    if (download.error || !download.data) return NextResponse.json({ error: 'The calendar invitation file is unavailable.' }, { status: 404 });
    const invite = parseInvite(await download.data.text());
    if (!invite) return NextResponse.json({ error: 'This invitation could not be resolved into a valid Calendar event.' }, { status: 422 });

    const { data: existing, error: existingError } = await ctx.db.from('calendar_events')
      .select('id,title,starts_at,ends_at')
      .eq('organization_id', ctx.organizationId)
      .eq('owner_user_id', ctx.userId)
      .contains('meeting_metadata', { source_ics_uid: invite.uid })
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: 'Unable to check for an existing Calendar event.' }, { status: 503 });
    if (existing) return NextResponse.json({ ok: true, existing: true, event: existing });

    const meetingProvider = invite.meetingUrl ? 'custom' : 'none';
    const { data: event, error } = await ctx.db.from('calendar_events').insert({
      organization_id: ctx.organizationId,
      owner_user_id: ctx.userId,
      created_by: ctx.userId,
      title: invite.title,
      description: invite.description,
      location: invite.location,
      starts_at: invite.startsAt,
      ends_at: invite.endsAt,
      timezone: invite.timezone,
      is_all_day: invite.isAllDay,
      status: 'confirmed',
      visibility: 'organization',
      show_as: 'busy',
      meeting_provider: meetingProvider,
      meeting_url: invite.meetingUrl,
      meeting_metadata: {
        source: 'mail_ics',
        source_ics_uid: invite.uid,
        source_message_id: messageId,
        source_attachment_id: attachmentId,
        organizer_email: invite.organizer || message.from_address || null,
      },
    }).select('id,title,starts_at,ends_at').single();
    if (error || !event) return NextResponse.json({ error: 'Unable to add this invitation to Calendar.' }, { status: 500 });
    return NextResponse.json({ ok: true, existing: false, event });
  } catch (error) {
    return fail(error);
  }
}
