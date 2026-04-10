import Link from 'next/link';
import { workspaceHeroClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className={`${workspaceHeroClass} border-dashed px-6 py-10 text-center sm:px-8`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-brand-50 via-white to-slate-100 text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-sky-500/20 dark:via-slate-900 dark:to-slate-800 dark:text-sky-300" aria-hidden="true">
        <span className="text-2xl">○</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">{description}</p> : null}
      {actionHref && actionLabel ? (
        <div className="mt-6">
          <Link href={actionHref} className={`inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${workspaceSecondaryButtonClass}`}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
