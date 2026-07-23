export function QueryIssuesAlert({
  title = 'Some live data could not be loaded',
  issues,
}: {
  title?: string;
  issues: string[];
}) {
  if (!issues.length) return null;

  return (
    <div className="rounded-hero border border-amber-200 bg-amber-50/95 px-5 py-4 text-sm text-amber-900 shadow-[0_14px_35px_rgba(217,119,6,0.08)] ring-1 ring-amber-900/5" role="status" aria-live="polite">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-amber-800">The page is still usable, but the items below need attention.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">Partial data</span>
      </div>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-6 text-amber-800">
        {issues.map((issue, index) => (
          <li key={`${issue}-${index}`}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
