'use client';

type Props = { open: boolean; onClose: () => void; leadCaptureHref?: string };

const OPTIONS: Array<{ icon: string; title: string; subtitle: string; tone: string; href?: string }> = [
  { icon: '📇', title: 'Scan business card', subtitle: 'Camera OCR → new lead draft', tone: 'bg-stage-new-bg text-stage-new-fg' },
  { icon: '🎙', title: 'Voice note', subtitle: 'Attach to any lead, quote, or order', tone: 'bg-danger-bg text-danger-fg' },
  { icon: '📷', title: 'Photo', subtitle: 'Sample, container, defect — attach to a record', tone: 'bg-stage-sample-bg text-stage-sample-fg' },
];

/** Quick Capture — reachable from every screen's header, not just the Leads
 * tab. The moment you meet someone or want to leave a note doesn't wait for
 * you to navigate to the right tab first. Works offline via the existing
 * IndexedDB capture queue + service worker sync. */
export function QuickCaptureSheet({ open, onClose, leadCaptureHref = '/mobile/capture' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/55 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-hero bg-surface-1 p-5 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-content-muted">Quick capture</p>
        <h2 className="mt-1 text-lg font-semibold text-content-primary">Capture from anywhere</h2>
        <p className="mt-1 text-xs font-medium text-content-muted">Works offline — syncs automatically when you're back online</p>
        <div className="mt-4 flex flex-col gap-2">
          <a href={leadCaptureHref} className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] text-lg ${OPTIONS[0].tone}`}>{OPTIONS[0].icon}</span>
            <span>
              <span className="block text-[13px] font-semibold text-content-primary">{OPTIONS[0].title}</span>
              <span className="block text-[11px] font-medium text-content-muted">{OPTIONS[0].subtitle}</span>
            </span>
          </a>
          {OPTIONS.slice(1).map((option) => (
            <button key={option.title} type="button" onClick={onClose} className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5 text-left">
              <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] text-lg ${option.tone}`}>{option.icon}</span>
              <span>
                <span className="block text-[13px] font-semibold text-content-primary">{option.title}</span>
                <span className="block text-[11px] font-medium text-content-muted">{option.subtitle}</span>
              </span>
            </button>
          ))}
          <a href="/leads?quickLead=1" className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-surface-2 text-content-secondary text-lg">✎</span>
            <span>
              <span className="block text-[13px] font-semibold text-content-primary">Add lead manually</span>
              <span className="block text-[11px] font-medium text-content-muted">Type it in yourself</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
