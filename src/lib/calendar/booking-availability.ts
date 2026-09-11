export type CalendarAvailabilityRule = {
  weekday: number;
  start_time: string;
  end_time: string;
  timezone?: string | null;
  is_active?: boolean | null;
};

export type BusyRange = { starts_at: string; ends_at: string; show_as?: string | null; status?: string | null };
export type BookingSlot = { startsAt: string; endsAt: string; organizerDate: string; organizerTime: string };

function parts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((out, part) => {
    if (part.type !== 'literal') out[part.type] = part.value;
    return out;
  }, {});
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

function zoneOffsetMs(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

export function zonedDateTimeToUtc(dateKey: string, clock: string, timeZone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = clock.slice(0, 5).split(':').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = new Date(wallClockAsUtc);
  let offset = zoneOffsetMs(candidate, timeZone);
  candidate = new Date(wallClockAsUtc - offset);
  const correctedOffset = zoneOffsetMs(candidate, timeZone);
  if (correctedOffset !== offset) candidate = new Date(wallClockAsUtc - correctedOffset);
  return candidate;
}

export function organizerDateKey(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function organizerWeekday(date: Date, timeZone: string) {
  const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
}

function addCalendarDays(dateKey: string, count: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + count));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function minutes(clock: string) {
  const [hour, minute] = clock.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function clock(minutesFromMidnight: number) {
  return `${String(Math.floor(minutesFromMidnight / 60)).padStart(2, '0')}:${String(minutesFromMidnight % 60).padStart(2, '0')}`;
}

function overlaps(start: Date, end: Date, busy: BusyRange, bufferMs: number) {
  if (busy.status === 'cancelled' || busy.show_as === 'free') return false;
  const busyStart = new Date(busy.starts_at).getTime() - bufferMs;
  const busyEnd = new Date(busy.ends_at).getTime() + bufferMs;
  return start.getTime() < busyEnd && end.getTime() > busyStart;
}

export function buildBookingSlots(input: {
  availability: CalendarAvailabilityRule[];
  busy: BusyRange[];
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingWindowDays: number;
  timeZone: string;
  now?: Date;
  intervalMinutes?: number;
  maxSlots?: number;
}) {
  const now = input.now ?? new Date();
  const intervalMinutes = Math.max(5, input.intervalMinutes ?? 30);
  const durationMinutes = Math.max(5, input.durationMinutes);
  const noticeAt = now.getTime() + Math.max(0, input.minimumNoticeMinutes) * 60000;
  const windowEnd = now.getTime() + Math.max(1, input.bookingWindowDays) * 86400000;
  const bufferMs = Math.max(0, input.bufferMinutes) * 60000;
  const rules = input.availability.filter(rule => rule.is_active !== false);
  const firstDate = organizerDateKey(now, input.timeZone);
  const out: BookingSlot[] = [];

  for (let dayOffset = 0; dayOffset <= input.bookingWindowDays; dayOffset += 1) {
    const dateKey = addCalendarDays(firstDate, dayOffset);
    const noon = zonedDateTimeToUtc(dateKey, '12:00', input.timeZone);
    const weekday = organizerWeekday(noon, input.timeZone);
    const dayRules = rules.filter(rule => Number(rule.weekday) === weekday);
    for (const rule of dayRules) {
      const startMinute = minutes(rule.start_time);
      const endMinute = minutes(rule.end_time);
      for (let minute = startMinute; minute + durationMinutes <= endMinute; minute += intervalMinutes) {
        const start = zonedDateTimeToUtc(dateKey, clock(minute), input.timeZone);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        if (start.getTime() < noticeAt || start.getTime() > windowEnd) continue;
        if (input.busy.some(range => overlaps(start, end, range, bufferMs))) continue;
        out.push({ startsAt: start.toISOString(), endsAt: end.toISOString(), organizerDate: dateKey, organizerTime: clock(minute) });
        if (out.length >= (input.maxSlots ?? 250)) return out;
      }
    }
  }
  return out;
}

export function requestedSlotIsValid(slots: BookingSlot[], startsAt: string) {
  const requested = new Date(startsAt);
  if (Number.isNaN(requested.valueOf())) return false;
  return slots.some(slot => new Date(slot.startsAt).getTime() === requested.getTime());
}
