'use client';

import Link from 'next/link';

type Props = {
  open: boolean;
  onClose: () => void;
  leadCaptureHref?: string;
  canCreateLeads?: boolean;
  canUseTradeShow?: boolean;
};

// These destinations reuse the authenticated CRM workflows. This dialog must
// never simulate saving a lead, sending a message or pricing a quote.
export function QuickCaptureSheet({
  open,
  onClose,
  leadCaptureHref = '/mobile/capture',
  canCreateLeads = true,
  canUseTradeShow = false,
}: Props) {
  if (!open) return null;

  const actions = [
    ...(canCreateLeads ? [
      { href: leadCaptureHref, icon: '▣', title: 'Scan business card', subtitle: 'Extract, review and save to the CRM' },
      { href: '/leads?quickLead=1', icon: '＋', title: 'Add lead manually', subtitle: 'Use the existing Quick Lead form' },
      { href: '/quick-quote', icon: '▤', title: 'Quick Quote', subtitle: 'Open the verified pricing workbench' },
    ] : []),
    ...(canUseTradeShow ? [
      { href: '/trade-events', icon: '◈', title: 'Trade Show Mode', subtitle: 'Select an event and capture visitors' },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-sm" onClick={onClose} role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-hero border border-line bg-surface-1 p-5 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">Mobile workspace</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-content-primary">What would you like to do?</h2>
            <p className="mt-1 text-xs text-content-muted">Real customer workflows, no duplicate records or demo actions.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close quick capture" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-content-primary">×</button>
        </div>
        <div className="mt-5 grid gap-2">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} onClick={() => onClose()} className="flex min-h-[70px] items-center gap-3 rounded-2xl border border-line bg-surface-1 px-3 py-3 transition active:scale-[.99]">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg font-semibold text-content-primary">{action.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-content-primary">{action.title}</span>
                <span className="mt-1 block text-[11px] leading-4 text-content-muted">{action.subtitle}</span>
              </span>
              <span aria-hidden="true" className="text-content-muted">›</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
