/** Cron may catch up briefly, but must never send 'Upcoming' for a past event. */
export function isCalendarReminderDue(occurrenceStart: string, minutesBefore: number, now: Date): boolean {
  const start = Date.parse(occurrenceStart);
  const minutes = Number(minutesBefore);
  const current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(minutes) || minutes < 0) return false;
  const due = start - minutes * 60000;
  return due <= current && current <= start && current - due < 15 * 60000;
}
