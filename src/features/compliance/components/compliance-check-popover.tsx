import Link from 'next/link';

type ComplianceCheckPopoverProps = {
  leadId: string;
  quoteId?: string | null;
  triggerLabel?: string;
  title?: string;
  contextLabel?: string;
  blockerReasons?: string[];
  compact?: boolean;
};

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}

export function ComplianceCheckPopover({
  leadId,
  quoteId,
  triggerLabel = 'Open compliance check',
  title = 'Compliance check',
  contextLabel = 'Current workflow',
  blockerReasons = [],
  compact = false,
}: ComplianceCheckPopoverProps) {
  const cleanLeadId = String(leadId ?? '').trim();
  const cleanQuoteId = String(quoteId ?? '').trim();
  const assistHref = cleanQuoteId
    ? `/compliance/assist?quoteId=${encodeURIComponent(cleanQuoteId)}`
    : `/compliance/assist?leadId=${encodeURIComponent(cleanLeadId)}`;
  const panelId = `compliance-check-${safeDomId(cleanQuoteId || cleanLeadId || 'current')}`;
  const reasons = blockerReasons.map((reason) => String(reason ?? '').trim()).filter(Boolean).slice(0, 3);

  return (
    <span className="relative inline-flex">
      <input id={panelId} type="checkbox" className="peer sr-only" aria-hidden="true" />
      <label
        htmlFor={panelId}
        className={
          compact
            ? 'inline-flex h-9 cursor-pointer items-center rounded-full bg-slate-950 px-3 text-xs font-semibold text-white shadow-soft transition hover:bg-slate-800'
            : 'inline-flex h-10 cursor-pointer items-center rounded-full bg-brand-primary px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark'
        }
      >
        {triggerLabel}
      </label>

      <span className="fixed inset-0 z-[80] hidden items-center justify-center bg-slate-950/60 p-4 peer-checked:flex sm:p-6">
        <label htmlFor={panelId} className="absolute inset-0 cursor-pointer">
          <span className="sr-only">Close compliance check</span>
        </label>
        <span className="relative z-[81] flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-panel border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
          <span className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <span className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Quote Review blocker</span>
              <span className="mt-1 block text-xl font-semibold tracking-tight text-slate-950">{title}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{contextLabel}</span>
              {reasons.length ? (
                <span className="mt-2 grid gap-1 text-xs leading-5 text-rose-700">
                  {reasons.map((reason) => (
                    <span key={reason}>• {reason}</span>
                  ))}
                </span>
              ) : null}
            </span>
            <span className="flex shrink-0 flex-wrap gap-2">
              <Link href={assistHref} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Open full screen
              </Link>
              <label htmlFor={panelId} className="cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Close
              </label>
            </span>
          </span>
          <iframe
            title="Compliance check"
            src={assistHref}
            className="h-[72vh] w-full bg-white"
          />
        </span>
      </span>
    </span>
  );
}
