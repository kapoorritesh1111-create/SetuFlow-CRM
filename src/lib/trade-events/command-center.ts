export type TradeEventStatus = 'live' | 'upcoming' | 'completed' | 'unscheduled';

export type CommandCenterEvent = {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  booth_number?: string | null;
  capture_defaults?: Record<string, unknown> | null;
};

export type TradeEventEntryLike = {
  id?: string | null;
  status?: string | null;
  normalized_payload?: Record<string, unknown> | null;
  captured_email?: string | null;
  captured_phone?: string | null;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function timestamp(value?: string | null) {
  return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function getTradeEventStatus(event: CommandCenterEvent, now = new Date()): TradeEventStatus {
  const today = startOfUtcDay(now);
  const starts = parseDate(event.starts_on);
  const ends = parseDate(event.ends_on) ?? starts;
  if (!starts && !ends) return 'unscheduled';
  if (starts && starts.getTime() > today.getTime()) return 'upcoming';
  if (ends && ends.getTime() < today.getTime()) return 'completed';
  return 'live';
}

export function selectCommandEvent<T extends CommandCenterEvent>(events: T[], now = new Date()): T | null {
  const live = events.filter((event) => getTradeEventStatus(event, now) === 'live').sort((left, right) => timestamp(left.ends_on ?? left.starts_on) - timestamp(right.ends_on ?? right.starts_on));
  if (live.length) return live[0];
  const upcoming = events.filter((event) => getTradeEventStatus(event, now) === 'upcoming').sort((left, right) => timestamp(left.starts_on) - timestamp(right.starts_on));
  if (upcoming.length) return upcoming[0];
  const completed = events.filter((event) => getTradeEventStatus(event, now) === 'completed').sort((left, right) => timestamp(right.ends_on ?? right.starts_on) - timestamp(left.ends_on ?? left.starts_on));
  return completed[0] ?? events[0] ?? null;
}

export function getEventTimingLabel(event: CommandCenterEvent, now = new Date()) {
  const today = startOfUtcDay(now);
  const starts = parseDate(event.starts_on);
  const ends = parseDate(event.ends_on) ?? starts;
  const dayMs = 24 * 60 * 60 * 1000;
  const status = getTradeEventStatus(event, now);
  if (status === 'live' && ends) return `Ends in ${Math.max(0, Math.ceil((ends.getTime() - today.getTime()) / dayMs))}d`;
  if (status === 'upcoming' && starts) return `Starts in ${Math.max(0, Math.ceil((starts.getTime() - today.getTime()) / dayMs))}d`;
  if (status === 'completed' && ends) return `Ended ${Math.max(0, Math.ceil((today.getTime() - ends.getTime()) / dayMs))}d ago`;
  return 'Dates needed';
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function eventBooth(event: CommandCenterEvent) {
  const defaults = objectValue(event.capture_defaults);
  return text(event.booth_number) || text(defaults.booth_number) || 'Not assigned';
}

export function eventReadiness(event: CommandCenterEvent) {
  const defaults = objectValue(event.capture_defaults);
  const checks = [
    { key: 'dates', label: 'Dates confirmed', done: Boolean(event.starts_on && event.ends_on) },
    { key: 'location', label: 'Location confirmed', done: Boolean(event.city || event.country) },
    { key: 'booth', label: 'Booth / stand confirmed', done: eventBooth(event) !== 'Not assigned' },
    { key: 'website', label: 'Official event source saved', done: Boolean(text(defaults.website_url)) },
    { key: 'image', label: 'Event artwork / image ready', done: Boolean(text(defaults.image_url)) },
    { key: 'capture', label: 'Capture workspace ready', done: Boolean(event.id) },
  ];
  return { score: Math.round((checks.filter((item) => item.done).length / checks.length) * 100), complete: checks.filter((item) => item.done).length, total: checks.length, checks };
}

export function entryProductInterest(entry: TradeEventEntryLike) {
  const payload = objectValue(entry.normalized_payload);
  return text(payload.product_interest) || text(payload.productInterest) || text(payload.interest);
}

export function entryFollowUpSla(entry: TradeEventEntryLike, now = new Date()) {
  const payload = objectValue(entry.normalized_payload);
  const dueRaw = text(payload.follow_up_promise_due_at) || text(payload.follow_up_sla_due_at);
  const due = dueRaw ? new Date(dueRaw) : null;
  const heat = text(payload.lead_heat) || 'review_later';
  const closed = ['converted', 'discarded'].includes(String(entry.status ?? '').toLowerCase());
  return {
    heat,
    dueAt: due && !Number.isNaN(due.getTime()) ? due.toISOString() : null,
    overdue: Boolean(!closed && due && !Number.isNaN(due.getTime()) && due.getTime() < now.getTime()),
  };
}

export function eventEntrySummary(entries: TradeEventEntryLike[], now = new Date()) {
  const pending = entries.filter((entry) => String(entry.status ?? '').toLowerCase() !== 'converted');
  const converted = entries.length - pending.length;
  const incomplete = entries.filter((entry) => !entryProductInterest(entry)).length;
  const contactable = entries.filter((entry) => Boolean(text(entry.captured_email) || text(entry.captured_phone))).length;
  const overdue = entries.filter((entry) => entryFollowUpSla(entry, now).overdue).length;
  const hot = entries.filter((entry) => entryFollowUpSla(entry, now).heat === 'hot').length;
  return { captured: entries.length, pending: pending.length, converted, incomplete, contactable, overdue, hot };
}
