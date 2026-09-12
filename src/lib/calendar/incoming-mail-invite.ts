import { isValidTimeZone, localDateTimeToUtc } from '@/lib/calendar/recurrence';

export type InviteResponse = 'accepted' | 'tentative' | 'declined';
export type ParsedInviteAttendee = { email: string; name: string | null; partstat: string | null; role: string | null };
export type ParsedMailInvite = {
  method: 'REQUEST' | 'PUBLISH' | 'CANCEL';
  uid: string;
  sequence: number;
  title: string;
  description: string | null;
  location: string | null;
  organizer: { email: string; name: string | null } | null;
  attendees: ParsedInviteAttendee[];
  startsAt: string;
  endsAt: string;
  timezone: string;
  isAllDay: boolean;
  meetingUrl: string | null;
};

type ParsedDate = { date: Date; timezone: string; allDay: boolean };

const WINDOWS_TIME_ZONES: Record<string, string> = {
  'eastern standard time': 'America/New_York',
  'central standard time': 'America/Chicago',
  'mountain standard time': 'America/Denver',
  'pacific standard time': 'America/Los_Angeles',
  'atlantic standard time': 'America/Halifax',
  'newfoundland standard time': 'America/St_Johns',
  'gmt standard time': 'Europe/London',
  'greenwich standard time': 'Atlantic/Reykjavik',
  'w. europe standard time': 'Europe/Berlin',
  'central europe standard time': 'Europe/Budapest',
  'central european standard time': 'Europe/Warsaw',
  'romance standard time': 'Europe/Paris',
  'fle standard time': 'Europe/Kyiv',
  'gtb standard time': 'Europe/Bucharest',
  'turkey standard time': 'Europe/Istanbul',
  'india standard time': 'Asia/Kolkata',
  'china standard time': 'Asia/Shanghai',
  'tokyo standard time': 'Asia/Tokyo',
  'aus eastern standard time': 'Australia/Sydney',
};

export function unfoldIcs(value: string) {
  return value.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function componentLines(lines: string[], component: string) {
  const begin = `BEGIN:${component.toUpperCase()}`;
  const end = `END:${component.toUpperCase()}`;
  let depth = 0;
  const out: string[] = [];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === begin) {
      depth += 1;
      if (depth === 1) continue;
    }
    if (upper === end) {
      if (depth === 1) break;
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) out.push(line);
  }
  return out;
}

function property(lines: string[], name: string, all = false) {
  const upper = `${name.toUpperCase()}:`;
  const parameterized = `${name.toUpperCase()};`;
  const found = lines.filter(item => item.toUpperCase().startsWith(upper) || item.toUpperCase().startsWith(parameterized));
  const parsed = found.map(line => {
    const split = line.indexOf(':');
    return split >= 0 ? { meta: line.slice(0, split), value: line.slice(split + 1).trim() } : null;
  }).filter((item): item is { meta: string; value: string } => Boolean(item));
  return all ? parsed : parsed[0] ?? null;
}

function text(value: string | null | undefined) {
  return String(value || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

function parameter(meta: string, name: string) {
  const match = new RegExp(`(?:^|;)${name}=((?:"[^"]*")|[^;:]*)`, 'i').exec(meta);
  return match?.[1]?.replace(/^"|"$/g, '').replace(/\\(["\\])/g, '$1').trim() || null;
}

function normalizeTimeZone(value: string | null | undefined) {
  const raw = String(value || '').trim().replace(/^"|"$/g, '');
  if (!raw) return null;
  if (isValidTimeZone(raw)) return raw;
  return WINDOWS_TIME_ZONES[raw.toLowerCase()] || null;
}

function emailValue(value: string) {
  const candidate = value.replace(/^mailto:/i, '').trim().toLowerCase();
  return /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(candidate) ? candidate : '';
}

function parseDate(entry: { meta: string; value: string } | null): ParsedDate | null {
  if (!entry) return null;
  const raw = entry.value;
  const timezone = normalizeTimeZone(parameter(entry.meta, 'TZID'));
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const iso = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}Z`;
    const date = new Date(iso);
    return Number.isNaN(date.valueOf()) ? null : { date, timezone: 'UTC', allDay: false };
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    const local = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}`;
    if (timezone) {
      const date = localDateTimeToUtc(local, timezone);
      return date && !Number.isNaN(date.valueOf()) ? { date, timezone, allDay: false } : null;
    }
    const date = new Date(`${local}Z`);
    return Number.isNaN(date.valueOf()) ? null : { date, timezone: 'UTC', allDay: false };
  }
  if (/^\d{8}$/.test(raw)) {
    const date = new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00Z`);
    return Number.isNaN(date.valueOf()) ? null : { date, timezone: timezone || 'UTC', allDay: true };
  }
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? null : { date, timezone: timezone || 'UTC', allDay: false };
}

export function parseIncomingMailInvite(value: string): ParsedMailInvite | null {
  const lines = unfoldIcs(value);
  const eventLines = componentLines(lines, 'VEVENT');
  if (!eventLines.length) return null;
  const methodRaw = String((property(lines, 'METHOD') as any)?.value || 'PUBLISH').toUpperCase();
  if (!['REQUEST', 'PUBLISH', 'CANCEL'].includes(methodRaw)) return null;
  const method = methodRaw as ParsedMailInvite['method'];
  const uid = text((property(eventLines, 'UID') as any)?.value);
  const start = parseDate(property(eventLines, 'DTSTART') as any);
  const end = parseDate(property(eventLines, 'DTEND') as any);
  if (!uid || !start || !end || end.date <= start.date) return null;
  const organizerEntry = property(eventLines, 'ORGANIZER') as { meta: string; value: string } | null;
  const organizerEmail = organizerEntry ? emailValue(organizerEntry.value) : '';
  const attendees = (property(eventLines, 'ATTENDEE', true) as Array<{ meta: string; value: string }>).map(entry => ({
    email: emailValue(entry.value),
    name: text(parameter(entry.meta, 'CN')) || null,
    partstat: parameter(entry.meta, 'PARTSTAT')?.toUpperCase() || null,
    role: parameter(entry.meta, 'ROLE')?.toUpperCase() || null,
  })).filter(item => Boolean(item.email));
  const title = text((property(eventLines, 'SUMMARY') as any)?.value) || 'Calendar invitation';
  const description = text((property(eventLines, 'DESCRIPTION') as any)?.value);
  const location = text((property(eventLines, 'LOCATION') as any)?.value);
  const urlField = text((property(eventLines, 'URL') as any)?.value);
  const haystack = [urlField, location, description].filter(Boolean).join('\n');
  const meetingUrl = /(https:\/\/[^\s<>"']+)/i.exec(haystack)?.[1]?.replace(/[),.;]+$/g, '') || null;
  const sequence = Math.max(0, Number.parseInt(String((property(eventLines, 'SEQUENCE') as any)?.value || '0'), 10) || 0);
  return {
    method,
    uid,
    sequence,
    title: title.slice(0, 240),
    description: description || null,
    location: location || null,
    organizer: organizerEmail ? { email: organizerEmail, name: organizerEntry ? text(parameter(organizerEntry.meta, 'CN')) || null : null } : null,
    attendees,
    startsAt: start.date.toISOString(),
    endsAt: end.date.toISOString(),
    timezone: start.timezone,
    isAllDay: start.allDay,
    meetingUrl,
  };
}

function esc(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function utc(value: string) { return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function icsText(value: string | null | undefined) { return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function icsParam(value: string | null | undefined) { return `"${String(value || '').replace(/(["\\])/g, '\\$1')}"`; }

export function buildIncomingInviteReply(invite: ParsedMailInvite, attendee: { email: string; name?: string | null }, response: InviteResponse) {
  if (!invite.organizer) throw new Error('This invitation does not identify an organizer who can receive your response.');
  const partstat = response === 'accepted' ? 'ACCEPTED' : response === 'tentative' ? 'TENTATIVE' : 'DECLINED';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Setu Flow//Setu Mail//EN', 'CALSCALE:GREGORIAN', 'METHOD:REPLY',
    'BEGIN:VEVENT', `UID:${invite.uid}`, `SEQUENCE:${invite.sequence}`, `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(invite.startsAt)}`, `DTEND:${utc(invite.endsAt)}`, `SUMMARY:${icsText(invite.title)}`,
    `ORGANIZER${invite.organizer.name ? `;CN=${icsParam(invite.organizer.name)}` : ''}:mailto:${invite.organizer.email}`,
    `ATTENDEE${attendee.name ? `;CN=${icsParam(attendee.name)}` : ''};PARTSTAT=${partstat};RSVP=FALSE:mailto:${attendee.email.toLowerCase()}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/** Keep genuine organizer notes, while removing provider-generated meeting boilerplate. */
export function conciseInviteNotes(description: string | null, meetingUrl: string | null) {
  let value = String(description || '').trim();
  if (!value) return '';
  if (meetingUrl) value = value.split(meetingUrl).join(' ');
  const providerMarker = /(?:^|\n|\r)(?:Microsoft Teams meeting|Join Zoom Meeting|Google Meet|View Details and Replies|________________________________________________________________________________)/i;
  const marker = providerMarker.exec(value);
  if (marker?.index !== undefined) value = value.slice(0, marker.index);
  value = value
    .replace(/(?:Join on your computer, mobile app or room device|Click here to join the meeting|Meeting ID:\s*[^\n]+|Passcode:\s*[^\n]+|Download Teams|Join on the web|Learn More|Meeting options)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value.slice(0, 1200);
}

export function incomingInviteCardHtml(options: { invite: ParsedMailInvite; messageId: string; attachmentId: string; mailboxId: string; mailboxAddress: string; response?: string | null }) {
  const { invite } = options;
  const zone = isValidTimeZone(invite.timezone) ? invite.timezone : 'UTC';
  const start = new Date(invite.startsAt), end = new Date(invite.endsAt);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start);
  const when = invite.isAllDay ? 'All day' : `${new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(start)} – ${new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(end)}`;
  const response = String(options.response || '').toLowerCase();
  const statusLabel = response === 'accepted' ? 'Accepted' : response === 'tentative' ? 'Tentative' : response === 'declined' ? 'Declined' : invite.method === 'CANCEL' ? 'Cancelled' : 'Response requested';
  const form = (choice: InviteResponse, label: string, primary = false) => `<form method="post" action="/api/mail/calendar-invite?mailboxId=${encodeURIComponent(options.mailboxId)}" style="display:inline;margin:0"><input type="hidden" name="messageId" value="${esc(options.messageId)}"><input type="hidden" name="attachmentId" value="${esc(options.attachmentId)}"><input type="hidden" name="response" value="${choice}"><button type="submit" style="min-height:44px;border-radius:10px;border:${primary ? '1px solid #14B8A6' : '1px solid #58708A'};background:${primary ? '#0F766E' : '#10233D'};color:#fff;padding:10px 15px;font-weight:700;font-size:14px;cursor:pointer">${label}</button></form>`;
  const actions = invite.method === 'REQUEST'
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:18px">${form('accepted','Accept',true)}${form('tentative','Tentative')}${form('declined','Decline')}</div>`
    : invite.method === 'PUBLISH'
      ? `<form method="post" action="/api/mail/calendar-invite?mailboxId=${encodeURIComponent(options.mailboxId)}" style="margin-top:18px"><input type="hidden" name="messageId" value="${esc(options.messageId)}"><input type="hidden" name="attachmentId" value="${esc(options.attachmentId)}"><input type="hidden" name="response" value="accepted"><button type="submit" style="min-height:44px;border-radius:10px;border:1px solid #14B8A6;background:#0F766E;color:#fff;padding:10px 15px;font-weight:700;font-size:14px;cursor:pointer">Add to Setu Calendar</button></form>`
      : '';
  const notes = conciseInviteNotes(invite.description, invite.meetingUrl);
  const organizer = invite.organizer ? `<div style="margin-top:5px">Organizer: <strong style="color:#fff">${esc(invite.organizer.name || invite.organizer.email)}</strong>${invite.organizer.name ? ` <span style="color:#9FB4CB">&lt;${esc(invite.organizer.email)}&gt;</span>` : ''}</div>` : '';
  return `<section data-setu-calendar-invite="true" style="font-family:Arial,sans-serif;margin:0 0 20px;padding:20px;border-radius:18px;background:#0B1B33;color:#F8FAFC;border:1px solid #1D4764;box-shadow:0 8px 24px rgba(2,12,27,.18)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5EEAD4;font-weight:800">Setu Calendar invitation</div><div style="padding:5px 9px;border-radius:999px;background:#132A47;color:#D8E6F3;font-size:11px;font-weight:700">${esc(statusLabel)}</div></div><h2 style="margin:12px 0 8px;color:#fff;font-size:22px;line-height:1.25">${esc(invite.title)}</h2><div style="color:#C9D8E8;font-size:14px;line-height:1.65"><div><strong style="color:#fff">${esc(day)}</strong></div><div>${esc(when)} · ${esc(zone)}</div>${invite.location ? `<div style="margin-top:5px">📍 ${esc(invite.location)}</div>` : ''}${organizer}${notes ? `<div style="margin-top:14px;padding:12px;border-radius:10px;background:#10233D"><div style="margin-bottom:4px;color:#5EEAD4;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em">Notes</div><div style="white-space:pre-wrap;color:#E4EDF6">${esc(notes)}</div></div>` : ''}${invite.meetingUrl ? `<div style="margin-top:14px"><a href="${esc(invite.meetingUrl)}" style="display:inline-block;border-radius:10px;background:#0F766E;color:#fff;padding:10px 14px;font-weight:800;text-decoration:none">Join meeting</a></div>` : ''}</div>${actions}</section>`;
}
