export function nextTenMinuteSyncAt(nowMs: number, active: boolean) {
  if (!active) return null;
  const intervalMs = 10 * 60 * 1000;
  return new Date(Math.ceil((nowMs + 1) / intervalMs) * intervalMs).toISOString();
}
