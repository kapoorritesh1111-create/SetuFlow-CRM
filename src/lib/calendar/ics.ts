export type IcsPartStat = 'NEEDS-ACTION' | 'ACCEPTED' | 'TENTATIVE' | 'DECLINED';
export type IcsAttendee = {
  email: string;
  name?: string | null;
  role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT';
  partstat?: IcsPartStat;
};

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  timezone?: string | null;
  isAllDay?: boolean;
  organizerEmail: string;
  organizerName: string;
  attendees: IcsAttendee[];
  meetingUrl?: string | null;
  sequence?: number;
  showAs?: string | null;
};

const esc = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const param = (value: string) => `"${value.replace(/(["\\])/g, '\\$1')}"`;
const utc = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function dateInZone(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${read('year')}${read('month')}${read('day')}`;
}

function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length) {
    const width = first ? 74 : 73;
    parts.push(`${first ? '' : ' '}${remaining.slice(0, width)}`);
    remaining = remaining.slice(width);
    first = false;
  }
  return parts.join('\r\n');
}

function attendeeLine(attendee: IcsAttendee) {
  const role = attendee.role ?? 'REQ-PARTICIPANT';
  const partstat = attendee.partstat ?? 'NEEDS-ACTION';
  const cn = attendee.name?.trim() ? `;CN=${param(attendee.name.trim())}` : '';
  return `ATTENDEE${cn};ROLE=${role};RSVP=TRUE;PARTSTAT=${partstat}:mailto:${attendee.email.trim().toLowerCase()}`;
}

export function buildIcs(event: IcsEvent, method: 'REQUEST' | 'CANCEL' = 'REQUEST') {
  const timezone = event.timezone || 'UTC';
  const description = [event.description, event.meetingUrl ? `Join meeting: ${event.meetingUrl}` : null]
    .filter(Boolean)
    .join('\n\n');
  const isCancelled = method === 'CANCEL';
  const dateLines = event.isAllDay
    ? [
        `DTSTART;VALUE=DATE:${dateInZone(event.startsAt, timezone)}`,
        `DTEND;VALUE=DATE:${dateInZone(event.endsAt, timezone)}`,
      ]
    : [`DTSTART:${utc(event.startsAt)}`, `DTEND:${utc(event.endsAt)}`];
  const transparent = event.showAs === 'free' ? 'TRANSPARENT' : 'OPAQUE';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Setu Flow//Setu Communications//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${event.uid}@setuflowcrm.com`,
    `SEQUENCE:${Math.max(0, Number(event.sequence ?? 0))}`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    ...dateLines,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(description)}`,
    event.location ? `LOCATION:${esc(event.location)}` : '',
    event.meetingUrl ? `URL:${event.meetingUrl}` : '',
    `ORGANIZER;CN=${param(event.organizerName)}:mailto:${event.organizerEmail.trim().toLowerCase()}`,
    ...event.attendees.map(attendeeLine),
    `STATUS:${isCancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    `TRANSP:${transparent}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return `${lines.map(fold).join('\r\n')}\r\n`;
}
