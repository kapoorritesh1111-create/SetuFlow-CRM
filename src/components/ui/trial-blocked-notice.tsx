import Link from 'next/link';

// S24-TRIAL-203 Pass A: reusable friendly blocked-state for guided trial limits.
// Render this instead of raw enforcement/trigger error text wherever a trial
// limit or capability flag blocks an action.
export function TrialBlockedNotice({
  title = 'Guided trial limit reached',
  message,
  showConvertCta = true,
}: {
  title?: string;
  message: string;
  showConvertCta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-700">{title}</p>
          <p className="mt-1 font-semibold leading-5">{message}</p>
        </div>
        {showConvertCta ? (
          <Link
            href="/trial"
            className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-extrabold text-amber-800 shadow-sm hover:bg-amber-50"
          >
            Review trial &amp; convert
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default TrialBlockedNotice;
