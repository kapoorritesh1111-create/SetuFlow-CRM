import { zonedDateTimeToUtc } from '@/lib/calendar/booking-availability';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  byDay: number[];
  count: number | null;
  until: Date | null;
  raw: string;
};

export type RecurringEventShape = {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
  recurrence_rule?: string | null;
};

export type RecurrenceOccurrence = {
  seriesId: string;
  originalStart: string;
  startsAt: string;
  endsAt: string;
};

export type RecurrencePresetOptions = {
  byDay?: number[];
  untilDate?: string | null;
};

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const DAY_INDEX = new Map(DAY_CODES.map((code, index) => [code, index]));
const SUPPORTED_KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL']);
const MAX_OCCURRENCES = 500;
const MAX_SCAN_DAYS = 20000;

export function isValidTimeZone(value: string) {
  const timeZone = String(value || '').trim();
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function wallClockParts(value: string | Date, timeZone: string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date).reduce<Record<string, string>>((out, part) => {
    if (part.type !== 'literal') out[part.type] = part.value;
    return out;
  }, {});
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    clock: `${parts.hour}:${parts.minute}`,
  };
}

export function dateTimeLocalValue(value: string | Date, timeZone: string) {
  const p = wallClockParts(value, timeZone);
  return `${p.dateKey}T${p.clock}`;
}

export function localDateTimeToUtc(localValue: string, timeZone: string) {
  const match = String(localValue || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match || !isValidTimeZone(timeZone)) return null;
  const requested = `${match[1]}T${match[2]}`;
  const date = zonedDateTimeToUtc(match[1], match[2], timeZone);
  if (Number.isNaN(date.valueOf())) return null;
  if (dateTimeLocalValue(date, timeZone) !== requested) return null;
  return date;
}

function parseUntil(value: string) {
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(9, 11));
    const minute = Number(value.slice(11, 13));
    const second = Number(value.slice(13, 15));
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function parseRecurrenceRule(input: string | null | undefined): RecurrenceRule | null {
  const raw = String(input || '').trim().replace(/^RRULE:/i, '').toUpperCase();
  if (!raw) return null;
  const values = new Map<string, string>();
  for (const part of raw.split(';').filter(Boolean)) {
    const [key, ...rest] = part.split('=');
    if (!key || !rest.length || !SUPPORTED_KEYS.has(key)) return null;
    values.set(key, rest.join('='));
  }
  const frequency = values.get('FREQ') as RecurrenceFrequency | undefined;
  if (!frequency || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) return null;
  const interval = values.has('INTERVAL') ? Number(values.get('INTERVAL')) : 1;
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) return null;
  let byDay: number[] = [];
  if (values.has('BYDAY')) {
    byDay = String(values.get('BYDAY')).split(',').map(code => DAY_INDEX.get(code as typeof DAY_CODES[number]) ?? -1);
    if (!byDay.length || byDay.some(day => day < 0) || new Set(byDay).size !== byDay.length) return null;
  }
  if (frequency !== 'WEEKLY' && byDay.length) return null;
  const count = values.has('COUNT') ? Number(values.get('COUNT')) : null;
  if (count !== null && (!Number.isInteger(count) || count < 1 || count > MAX_OCCURRENCES)) return null;
  const until = values.has('UNTIL') ? parseUntil(String(values.get('UNTIL'))) : null;
  if (values.has('UNTIL') && !until) return null;
  if (count !== null && until) return null;
  return { frequency, interval, byDay, count, until, raw };
}

export function normalizeRecurrenceRule(input: string | null | undefined) {
  const parsed = parseRecurrenceRule(input);
  if (!input) return null;
  if (!parsed) throw new Error('Choose a supported recurrence pattern.');
  const parts = [`FREQ=${parsed.frequency}`];
  if (parsed.interval !== 1) parts.push(`INTERVAL=${parsed.interval}`);
  if (parsed.byDay.length) parts.push(`BYDAY=${parsed.byDay.map(day => DAY_CODES[day]).join(',')}`);
  if (parsed.count !== null) parts.push(`COUNT=${parsed.count}`);
  if (parsed.until) parts.push(`UNTIL=${parsed.until.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
  return parts.join(';');
}

function formatUntilDate(untilDate: string | null | undefined, timeZone: string) {
  const dateKey = String(untilDate || '').trim();
  if (!dateKey) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('Choose a valid recurrence end date.');
  const inclusiveEnd = localDateTimeToUtc(`${dateKey}T23:59`, timeZone);
  if (!inclusiveEnd) throw new Error('Choose a valid recurrence end date.');
  return inclusiveEnd.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function recurrencePresetRule(
  preset: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly',
  startsAt: string,
  timeZone: string,
  options: RecurrencePresetOptions = {},
) {
  if (preset === 'none') return null;
  const parts: string[] = [];
  if (preset === 'daily') parts.push('FREQ=DAILY');
  else if (preset === 'weekdays') parts.push('FREQ=WEEKLY', 'BYDAY=MO,TU,WE,TH,FR');
  else if (preset === 'monthly') parts.push('FREQ=MONTHLY');
  else {
    const fallbackDay = wallClockParts(startsAt, timeZone).weekday;
    const requestedDays = Array.isArray(options.byDay) ? options.byDay : [];
    const days = [...new Set(requestedDays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
    const selectedDays = days.length ? days : [Math.max(0, fallbackDay)];
    parts.push('FREQ=WEEKLY', `BYDAY=${selectedDays.map(day => DAY_CODES[day]).join(',')}`);
  }
  const until = formatUntilDate(options.untilDate, timeZone);
  if (until) parts.push(`UNTIL=${until}`);
  return parts.join(';');
}

function addCalendarDays(dateKey: string, count: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + count));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function calendarDayDiff(fromKey: string, toKey: string) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function monthDiff(fromKey: string, toKey: string) {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function dayOfMonth(dateKey: string) { return Number(dateKey.slice(8, 10)); }
function weekdayForDateKey(dateKey: string) { const [year, month, day] = dateKey.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay(); }

function matchesRuleDate(rule: RecurrenceRule, startDateKey: string, dateKey: string, startWeekday: number) {
  const dayDiff = calendarDayDiff(startDateKey, dateKey);
  if (dayDiff < 0) return false;
  if (rule.frequency === 'DAILY') return dayDiff % rule.interval === 0;
  if (rule.frequency === 'WEEKLY') {
    const weekIndex = Math.floor(dayDiff / 7);
    const days = rule.byDay.length ? rule.byDay : [startWeekday];
    return weekIndex % rule.interval === 0 && days.includes(weekdayForDateKey(dateKey));
  }
  const months = monthDiff(startDateKey, dateKey);
  return months >= 0 && months % rule.interval === 0 && dayOfMonth(dateKey) === dayOfMonth(startDateKey);
}

export function expandRecurringEvent(event: RecurringEventShape, from: Date, to: Date, maxOccurrences = MAX_OCCURRENCES): RecurrenceOccurrence[] {
  const rule = parseRecurrenceRule(event.recurrence_rule);
  if (!rule || to <= from) return [];
  const timeZone = isValidTimeZone(String(event.timezone || '')) ? String(event.timezone) : 'UTC';
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) return [];
  const startParts = wallClockParts(start, timeZone);
  const durationMs = end.getTime() - start.getTime();
  const out: RecurrenceOccurrence[] = [];
  let matchedCount = 0;
  let dateKey = startParts.dateKey;

  for (let scanned = 0; scanned <= MAX_SCAN_DAYS && out.length < Math.max(1, Math.min(maxOccurrences, MAX_OCCURRENCES)); scanned += 1) {
    const occurrenceStart = zonedDateTimeToUtc(dateKey, startParts.clock, timeZone);
    if (occurrenceStart > to && dateKey > startParts.dateKey) break;
    if (matchesRuleDate(rule, startParts.dateKey, dateKey, startParts.weekday)) {
      matchedCount += 1;
      if (rule.count !== null && matchedCount > rule.count) break;
      if (rule.until && occurrenceStart > rule.until) break;
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      if (occurrenceStart < to && occurrenceEnd > from) out.push({ seriesId: event.id, originalStart: occurrenceStart.toISOString(), startsAt: occurrenceStart.toISOString(), endsAt: occurrenceEnd.toISOString() });
    }
    dateKey = addCalendarDays(dateKey, 1);
  }
  return out;
}

export function recurrenceOccurrenceId(seriesId: string, originalStart: string) { return `recurrence:${seriesId}:${encodeURIComponent(originalStart)}`; }

export function parseRecurrenceOccurrenceId(value: string) {
  const match = String(value || '').match(/^recurrence:([0-9a-f-]{36}):(.+)$/i);
  if (!match) return null;
  try {
    const originalStart = decodeURIComponent(match[2]);
    const date = new Date(originalStart);
    if (Number.isNaN(date.valueOf())) return null;
    return { seriesId: match[1], originalStart: date.toISOString() };
  } catch {
    return null;
  }
}
