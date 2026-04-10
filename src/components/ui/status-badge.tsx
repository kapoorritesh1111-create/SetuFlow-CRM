import { cn } from '@/lib/utils';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-100/90 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  className,
  dot = true,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}

export function getStatusTone(status: string): StatusTone {
  const value = status.trim().toLowerCase();
  if (['done', 'complete', 'won', 'qualified', 'active', 'in progress', 'ready'].includes(value)) return 'success';
  if (['warning', 'waiting', 'next'].includes(value)) return 'warning';
  if (['at risk', 'blocked', 'lost', 'danger'].includes(value)) return 'danger';
  if (['new', 'info', 'review'].includes(value)) return 'info';
  return 'neutral';
}
