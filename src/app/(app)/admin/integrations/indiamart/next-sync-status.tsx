type Props = {
  active: boolean;
  nowMs: number;
};

function nextTenMinuteBoundary(nowMs: number) {
  const intervalMs = 10 * 60 * 1000;
  return new Date(Math.ceil((nowMs + 1) / intervalMs) * intervalMs);
}

export function IndiaMartNextSyncStatus({ active, nowMs }: Props) {
  if (!active) {
    return <p className="mt-1 text-xs font-semibold text-slate-500">Next sync: paused</p>;
  }

  const next = nextTenMinuteBoundary(nowMs);
  const formatted = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(next);

  return <p className="mt-1 text-xs font-semibold text-emerald-700">Next automatic sync: {formatted}</p>;
}
