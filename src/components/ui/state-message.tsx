import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type StateTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const WRAPPER_CLASSES: Record<StateTone, string> = {
  neutral: 'border-slate-200 bg-slate-50/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/78 dark:text-slate-200',
  success: 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/45 dark:text-rose-200',
  info: 'border-blue-200 bg-blue-50/95 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/45 dark:text-blue-200',
};

const TONE_ICON: Record<StateTone, string> = {
  neutral: 'sparkles',
  success: 'check-circle-o',
  warning: 'warning',
  danger: 'exclamation-circle',
  info: 'file-text-o',
};

export function StateMessage({ title, description, tone = 'neutral', className }: { title: string; description?: string; tone?: StateTone; className?: string }) {
  return (
    <div className={cn('rounded-panel border px-4 py-3.5 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/[0.02] dark:ring-white/[0.03]', WRAPPER_CLASSES[tone], className)} role="status">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/65 text-[13px] shadow-sm" aria-hidden="true">
          <FaIcon icon={TONE_ICON[tone]} fixedWidth />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-1 leading-6">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
