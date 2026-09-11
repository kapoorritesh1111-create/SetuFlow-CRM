import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { buildIcs, type IcsAttendee, type IcsPartStat } from '@/lib/calendar/ics';

export const dynamic = 'force-dynamic';
const RESEND_API = 'https://api.resend.com/emails';
const MAX_ATTENDEES = 100;

type InviteAction = 'request' | 'update' | 'cancel';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function partStat(value: unknown): IcsPartStat {
  const normalized = String(value ?? 'needs_action').toLowerCase();
  if (normalized === 'accepted') return 'ACCEPTED';
  if (normalized === 'tentative') return 'TENTATIVE';
  if (normalized === 'declined') return 'DECLINED';
  return 'NEEDS-ACTION';
}

function formatWhen(event: any) {
  if (event.is_all_day) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: event.timezone || 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(event.starts_at));
  }
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone || 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(event.starts_at));
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone || 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(event.starts_at));
  const end = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone || 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(event.ends_at));
  return `${date} · ${time} – ${end}`;
}

function inviteHtml(event: any, attendee: any, organizerName: string, origin: string, method: 'REQUEST' | 'CANCEL') {
  const title = escapeHtml(event.title);
  const when = escapeHtml(formatWhen(event));
  const organizer = escapeHtml(organizerName);
  const location = event.location ? `<p style="margin:6px 0;color:#475569"><strong>Location:</strong> ${escapeHtml(event.location)}</p>` : '';
  const join = event.meeting_url && method === 'REQUEST'
    ? `<p style="margin:20px 0"><a href="${escapeHtml(event.meeting_url)}" style="display:inline-block;padding:11px 16px;background:#0B2E4A;color:white;text-decoration:none;border-radius:8px;font-weight:700">Join meeting</a></p>`
    : '';
  const responseBase = `${origin}/rsvp/${attendee.response_token}`;
  const responses = method === 'REQUEST'
    ? `<div style="margin:22px 0 8px"><a href="${responseBase}?response=accepted" style="display:inline-block;margin-right:8px;padding:9px 13px;background:#0B2E4A;color:#fff;text-decoration:none;border-radius:7px;font-weight:700">Accept</a><a href="${responseBase}?response=tentative" style="display:inline-block;margin-right:8px;padding:9px 13px;background:#f1f5f9;color:#0f172a;text-decoration:none;border-radius:7px;font-weight:700">Tentative</a><a href="${responseBase}?response=declined" style="display:inline-block;padding:9px 13px;background:#f1f5f9;color:#0f172a;text-decoration:none;border-radius:7px;font-weight:700">Decline</a></div><p style="margin:6px 0;color:#64748b;font-size:12px">You can also respond directly from Outlook, Google Calendar or Apple Calendar using the attached calendar invitation.</p>`
    : '<p style="margin:16px 0;color:#b91c1c;font-weight:700">This meeting has been cancelled.</p>';
  const heading = method === 'CANCEL' ? `Cancelled: ${title}` : title;
  return `<div style="font-family:Arial,sans-serif;max-width:620px;color:#0f172a"><h2 style="margin-bottom:10px">${heading}</h2><p style="margin:6px 0;color:#475569">${when}</p>${location}${join}${responses}<p style="margin-top:22px;color:#64748b">Organized by ${organizer}</p><p style="color:#94a3b8;font-size:12px">Setu Calendar · Calendar invitation attached.</p></div>`;
}

async function sendOne(apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(data?.message || data?.error || `Resend returned ${response.status}.`);
  return data;
}

export async function POST(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.RESEND_FROM_EMAIL || '').trim();
  if (!apiKey || !from) return NextResponse.json({ error: 'Calendar email delivery is not configured.' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || '').trim();
  const action = (['request', 'update', 'cancel'].includes(body.action) ? body.action : 'request') as InviteAction;
  const force = body.force === true;
  if (!eventId) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });

  const db = (await createClient()) as any;
  const { data: event, error } = await db
    .from('calendar_events')
    .select('*,calendar_attendees(*)')
    .eq('id', eventId)
    .eq('organization_id', workspace.organization.id)
    .single();
  if (error || !event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const attendees = Array.isArray(event.calendar_attendees) ? event.calendar_attendees : [];
  if (attendees.length > MAX_ATTENDEES) return NextResponse.json({ error: `Calendar invitations support up to ${MAX_ATTENDEES} attendees per event.` }, { status: 400 });
  if (!attendees.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0, failed: 0 });

  const method: 'REQUEST' | 'CANCEL' = action === 'cancel' || event.status === 'cancelled' ? 'CANCEL' : 'REQUEST';
  if (method === 'REQUEST' && event.meeting_provider === 'zoom' && !event.meeting_url) {
    return NextResponse.json({ error: 'Create the Zoom meeting before sending invitations.' }, { status: 409 });
  }

  const organizerEmail = String(workspace.profile?.email ?? workspace.user.email ?? '').trim();
  const organizerName = String(workspace.profile?.full_name ?? workspace.profile?.username ?? 'Setu Flow').trim();
  if (!organizerEmail) return NextResponse.json({ error: 'Organizer email is unavailable.' }, { status: 400 });

  const icsAttendees: IcsAttendee[] = attendees.map((attendee: any) => ({
    email: String(attendee.email || '').trim().toLowerCase(),
    name: attendee.name || null,
    role: attendee.attendee_type === 'optional' ? 'OPT-PARTICIPANT' : 'REQ-PARTICIPANT',
    partstat: partStat(attendee.rsvp_status),
  }));
  const ics = buildIcs({
    uid: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    isAllDay: Boolean(event.is_all_day),
    organizerEmail,
    organizerName,
    attendees: icsAttendees,
    meetingUrl: event.meeting_url,
    sequence: Number(event.ics_sequence ?? 0),
    showAs: event.show_as,
  }, method);

  const sequence = Number(event.ics_sequence ?? 0);
  const pending = attendees.filter((attendee: any) => force || Number(attendee.last_invited_sequence ?? -1) !== sequence || attendee.last_invitation_method !== method);
  const skipped = attendees.length - pending.length;
  const origin = req.nextUrl.origin;
  const results: Array<{ attendeeId: string; ok: boolean; providerId?: string; error?: string }> = [];

  for (let index = 0; index < pending.length; index += 8) {
    const batch = pending.slice(index, index + 8);
    const settled = await Promise.all(batch.map(async (attendee: any) => {
      const email = String(attendee.email || '').trim().toLowerCase();
      if (!email || !attendee.response_token) return { attendeeId: attendee.id, ok: false, error: 'Attendee email or response token is missing.' };
      const subjectPrefix = method === 'CANCEL' ? 'Cancelled' : action === 'update' || sequence > 0 ? 'Updated invitation' : 'Invitation';
      try {
        const delivered = await sendOne(apiKey, {
          from,
          to: [email],
          reply_to: organizerEmail,
          subject: `${subjectPrefix}: ${event.title}`,
          html: inviteHtml(event, attendee, organizerName, origin, method),
          attachments: [{
            filename: method === 'CANCEL' ? 'cancelled-event.ics' : 'invite.ics',
            content: Buffer.from(ics).toString('base64'),
            content_type: `text/calendar; method=${method}; charset=UTF-8`,
          }],
        });
        await db.from('calendar_attendees').update({
          last_invited_at: new Date().toISOString(),
          last_invited_sequence: sequence,
          last_invitation_method: method,
        }).eq('id', attendee.id).eq('organization_id', workspace.organization.id);
        return { attendeeId: attendee.id, ok: true, providerId: delivered?.id ? String(delivered.id) : undefined };
      } catch (sendError) {
        return { attendeeId: attendee.id, ok: false, error: sendError instanceof Error ? sendError.message : 'Invitation delivery failed.' };
      }
    }));
    results.push(...settled);
  }

  const sent = results.filter(result => result.ok).length;
  const failures = results.filter(result => !result.ok);
  if (!sent && failures.length) return NextResponse.json({ error: 'Unable to send calendar invitations.', sent, skipped, failed: failures.length }, { status: 502 });
  return NextResponse.json({ ok: failures.length === 0, sent, skipped, failed: failures.length, partial: failures.length > 0 }, { status: failures.length ? 207 : 200 });
}
