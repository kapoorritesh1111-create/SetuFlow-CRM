'use client';

type Props = { open: boolean; onClose: () => void; leadCaptureHref?: string };

// Keep this sheet limited to real destinations. Voice dictation and photo
// attachments remain contextual actions within their existing workflows,
// not standalone buttons that silently dismiss the sheet.
const CAPTURE_ACTIONS = [
  { href: '/leads?quickLead=1', icon: '✎', title: 'Add lead manually', subtitle: 'Create a lead with the existing CRM form', tone: 'bg-surface-2 text-content-secondary' },
  { href: '/trade-events', icon: '▣', title: 'Trade show capture', subtitle: 'Select an event, scan or dictate', tone: 'bg-stage-sample-bg text-stage-sample-fg' },
] as const;

/** Opens existing capture routes; does not create a second lead system. */
export function QuickCaptureSheet({ open, onClose, leadCaptureHref = '/mobile/capture' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/55 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-hero bg-surface-1 p-5 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-content-muted">Quick capture</p>
            <h2 className="mt-1 text-lg font-semibold text-content-primary">Capture from anywhere</h2>
            <p className="mt-1 text-xs font-medium text-content-muted">Save a contact now or select a trade show</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close quick capture" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-content-primary">×</button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <a href={leadCaptureHref} className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-stage-new-bg text-stage-new-fg text-lg">📇</span>
            <span>
              <span className="block text-[13px] font-semibold text-content-primary">Scan business card</span>
              <span className="block text-[11px] font-medium text-content-muted">Camera scan and lead review</span>
            </span>
          </a>
          {CAPTURE_ACTIONS.map((action) => (
            <a key={action.href} href={action.href} className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] text-lg ${action.tone}`}>{action.icon}</span>
              <span>
                <span className="block text-[13px] font-semibold text-content-primary">{action.title}</span>
                <span className="block text-[11px] font-medium text-content-muted">{action.subtitle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
