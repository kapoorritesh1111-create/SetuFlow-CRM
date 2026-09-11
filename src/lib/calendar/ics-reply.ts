const EVENT_UID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@setuflowcrm\.com$/i;
const RESPONSES: Record<string, 'accepted' | 'tentative' | 'declined'> = {
  ACCEPTED: 'accepted',
  TENTATIVE: 'tentative',
  DECLINED: 'declined',
};

function unfold(value: string) {
  return value.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function attendeeReply(line: string) {
  if (!line.toUpperCase().startsWith('ATTENDEE')) return null;
  const split = line.indexOf(':');
  if (split < 0) return null;
  const params = line.slice(0, split).split(';').slice(1);
  const address = line.slice(split + 1).replace(/^mailto:/i, '').trim().toLowerCase();
  const partstat = params.map(value => value.split('=', 2)).find(([key]) => key.toUpperCase() === 'PARTSTAT')?.[1]?.toUpperCase();
  const response = partstat ? RESPONSES[partstat] : undefined;
  return address && response ? { email: address, response } : null;
}

export function parseCalendarReply(value: string) {
  const lines = unfold(value);
  const method = lines.find(line => line.toUpperCase().startsWith('METHOD:'))?.slice(7).trim().toUpperCase();
  if (method !== 'REPLY') return null;
  const uid = lines.find(line => line.toUpperCase().startsWith('UID:'))?.slice(4).trim() ?? '';
  const match = EVENT_UID_RE.exec(uid);
  if (!match) return null;
  const replies = lines.map(attendeeReply).filter((item): item is NonNullable<ReturnType<typeof attendeeReply>> => Boolean(item));
  if (!replies.length) return null;
  return { eventId: match[1], replies };
}

export async function applyCalendarReply(admin: any, options: { organizationId: string; fromAddress: string; ics: string }) {
  const parsed = parseCalendarReply(options.ics);
  if (!parsed) return { matched: false, updated: false };
  const from = options.fromAddress.trim().toLowerCase();
  const reply = parsed.replies.find(item => item.email === from);
  if (!reply) return { matched: true, updated: false };

  const { data: event } = await admin.from('calendar_events').select('id,status').eq('id', parsed.eventId).eq('organization_id', options.organizationId).maybeSingle();
  if (!event || event.status === 'cancelled') return { matched: true, updated: false };
  const now = new Date().toISOString();
  const { data, error } = await admin.from('calendar_attendees').update({
    rsvp_status: reply.response,
    responded_at: now,
    responded_via: 'calendar_reply',
  }).eq('event_id', event.id).eq('organization_id', options.organizationId).ilike('email', from).select('id').maybeSingle();
  return { matched: true, updated: Boolean(data) && !error, response: reply.response };
}
